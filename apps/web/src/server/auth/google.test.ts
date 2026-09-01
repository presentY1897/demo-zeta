import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@theta/db/testing";
import { users } from "@theta/db";
import { findOrCreateGoogleUser } from "./core";
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  createAuthorizationRequest,
  decodeIdToken,
  exchangeCode,
} from "./google";
import { GET as googleStart } from "@/app/api/auth/google/route";
import { GET as googleCallback } from "@/app/api/auth/google/callback/route";
import { getRequest } from "./testing";
import { SESSION_COOKIE } from "./session";

const ORIGIN = "http://localhost:3000";

function idToken(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${body}.signature`;
}

describe("authorization 요청", () => {
  it("PKCE와 state를 담은 구글 URL을 만든다", () => {
    const { url, state, codeVerifier } = createAuthorizationRequest("client-id", `${ORIGIN}/cb`);
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe("client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/cb`);
    expect(parsed.searchParams.get("scope")).toBe("openid email profile");
    expect(parsed.searchParams.get("state")).toBe(state);
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    // challenge는 verifier의 SHA-256이므로 verifier 자체가 노출되지 않는다
    expect(parsed.searchParams.get("code_challenge")).not.toBe(codeVerifier);
  });

  it("호출마다 state·verifier가 달라진다", () => {
    const a = createAuthorizationRequest("c", "u");
    const b = createAuthorizationRequest("c", "u");
    expect(a.state).not.toBe(b.state);
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
  });
});

describe("id_token 해석", () => {
  it("sub·email·name을 읽는다", () => {
    expect(decodeIdToken(idToken({ sub: "g-1", email: "a@b.co", name: "홍길동" }))).toEqual({
      sub: "g-1",
      email: "a@b.co",
      name: "홍길동",
    });
  });

  it("sub이나 email이 없거나 형식이 깨지면 null", () => {
    expect(decodeIdToken(idToken({ email: "a@b.co" }))).toBeNull();
    expect(decodeIdToken(idToken({ sub: "g-1" }))).toBeNull();
    expect(decodeIdToken("깨진토큰")).toBeNull();
  });
});

describe("코드 교환 (fetch 목킹)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("성공하면 identity를 돌려준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ id_token: idToken({ sub: "g-1", email: "a@b.co", name: "홍길동" }) }),
      ),
    );
    const result = await exchangeCode(
      { clientId: "c", clientSecret: "s" },
      { code: "code", codeVerifier: "v", redirectUri: "u" },
    );
    expect(result).toEqual({ ok: true, identity: { sub: "g-1", email: "a@b.co", name: "홍길동" } });
  });

  it("구글이 에러를 주면 한국어 안내로 바꾼다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 400 })));
    const result = await exchangeCode(
      { clientId: "c", clientSecret: "s" },
      { code: "code", codeVerifier: "v", redirectUri: "u" },
    );
    expect(result.ok).toBe(false);
  });
});

describe("계정 매칭 3분기", () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await createTestDb();
  }, 120_000);
  afterAll(async () => {
    await t?.close();
  });
  beforeEach(async () => {
    await t.reset();
  });

  it("① google_sub이 있으면 같은 계정으로 로그인된다", async () => {
    const first = await findOrCreateGoogleUser(t.db, { sub: "g-1", email: "a@b.co", name: "홍길동" });
    const again = await findOrCreateGoogleUser(t.db, { sub: "g-1", email: "a@b.co", name: "홍길동" });
    expect(first.ok && again.ok).toBe(true);
    expect(first.ok && again.ok && first.user.id).toBe(again.ok ? again.user.id : null);
    expect(await t.db.select().from(users)).toHaveLength(1);
  });

  it("② 이메일이 같은 기존 계정이 있으면 google_sub을 연결한다", async () => {
    const [existing] = await t.db
      .insert(users)
      .values({ email: "a@b.co", nickname: "기존유저", passwordHash: "$2b$10$dummydummydummy" })
      .returning();

    const result = await findOrCreateGoogleUser(t.db, { sub: "g-2", email: "A@B.co", name: "다른이름" });
    expect(result.ok).toBe(true);
    expect(result.ok && result.user.id).toBe(existing!.id);
    // 닉네임은 그대로 두고 sub만 붙인다
    expect(result.ok && result.user.nickname).toBe("기존유저");
    expect(result.ok && result.user.googleSub).toBe("g-2");
    expect(await t.db.select().from(users)).toHaveLength(1);
  });

  it("③ 둘 다 없으면 신규 생성 — 닉네임 중복 시 숫자 접미", async () => {
    await t.db.insert(users).values({ email: "taken@b.co", nickname: "홍길동" });

    const result = await findOrCreateGoogleUser(t.db, { sub: "g-3", email: "new@b.co", name: "홍길동" });
    expect(result.ok).toBe(true);
    expect(result.ok && result.user.nickname).toBe("홍길동2");
    // 비밀번호 없는 계정 — 비밀번호 로그인이 열리지 않는다
    expect(result.ok && result.user.passwordHash).toBeNull();
  });

  it("제재된 계정은 구글로도 들어올 수 없다", async () => {
    await t.db
      .insert(users)
      .values({ email: "banned@b.co", nickname: "제재유저", googleSub: "g-4", status: "suspended" });
    const result = await findOrCreateGoogleUser(t.db, { sub: "g-4", email: "banned@b.co" });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.status).toBe(403);
  });
});

describe("라우트", () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await createTestDb();
  }, 120_000);
  afterAll(async () => {
    await t?.close();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });
  beforeEach(async () => {
    await t.reset();
    process.env.GOOGLE_CLIENT_ID = "test-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("시작 라우트는 state·verifier 쿠키를 심고 구글로 보낸다", async () => {
    const res = await googleStart(getRequest(`${ORIGIN}/api/auth/google`));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("accounts.google.com");
    expect(res.cookies.get(GOOGLE_STATE_COOKIE)?.value).toBeTruthy();
    expect(res.cookies.get(GOOGLE_VERIFIER_COOKIE)?.value).toBeTruthy();
  });

  it("키가 없으면 시작 라우트는 로그인 화면으로 되돌린다", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const res = await googleStart(getRequest(`${ORIGIN}/api/auth/google`));
    expect(res.headers.get("location")).toContain("/login");
  });

  it("콜백은 state가 맞아야 세션을 발급한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ id_token: idToken({ sub: "g-9", email: "g@b.co", name: "구글유저" }) })),
    );

    const res = await googleCallback(
      getRequest(`${ORIGIN}/api/auth/google/callback?code=abc&state=s1`, {
        [GOOGLE_STATE_COOKIE]: "s1",
        [GOOGLE_VERIFIER_COOKIE]: "v1",
      }),
    );
    expect(res.cookies.get(SESSION_COOKIE)?.value).toBeTruthy();
    expect(res.headers.get("location")).toBe(`${ORIGIN}/`);

    const [created] = await t.db.select().from(users).where(eq(users.googleSub, "g-9"));
    expect(created?.email).toBe("g@b.co");
  });

  it("state가 다르면 세션을 발급하지 않는다 (CSRF 방어)", async () => {
    const res = await googleCallback(
      getRequest(`${ORIGIN}/api/auth/google/callback?code=abc&state=attacker`, {
        [GOOGLE_STATE_COOKIE]: "s1",
        [GOOGLE_VERIFIER_COOKIE]: "v1",
      }),
    );
    expect(res.cookies.get(SESSION_COOKIE)?.value).toBeFalsy();
    expect(res.headers.get("location")).toContain("/login?error=");
    expect(await t.db.select().from(users)).toHaveLength(0);
  });
});
