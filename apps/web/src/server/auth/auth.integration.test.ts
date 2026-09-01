import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "@theta/db/testing";
import { sessions, users } from "@theta/db";
import { DEMO_PASSWORD, demoEmail } from "@theta/db/demo";
import { seed } from "@theta/db/seed";
import { POST as signupRoute } from "@/app/api/auth/signup/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { GET as meRoute } from "@/app/api/auth/me/route";
import { SESSION_COOKIE } from "./session";
import { getRequest, jsonRequest, sessionCookieOf } from "./testing";

let t: TestDb;

const ORIGIN = "http://localhost:3000";
const signupBody = { email: "new@example.com", password: "theta-demo", nickname: "새벽고래" };

beforeAll(async () => {
  t = await createTestDb();
}, 120_000);

afterAll(async () => {
  await t?.close();
});

beforeEach(async () => {
  await t.reset();
});

async function signup(body = signupBody) {
  return signupRoute(jsonRequest(`${ORIGIN}/api/auth/signup`, body));
}

describe("회원가입", () => {
  it("성공하면 세션 쿠키가 함께 내려오고 DB에 세션 행이 생긴다", async () => {
    const res = await signup();
    expect(res.status).toBe(200);

    const token = sessionCookieOf(res);
    expect(token).toBeTruthy();

    const rows = await t.db.select().from(sessions).where(eq(sessions.token, token!));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const body = (await res.json()) as { user: { nickname: string; email: string } };
    expect(body.user.nickname).toBe("새벽고래");
    // 비밀번호 해시는 절대 응답에 실리지 않는다
    expect(JSON.stringify(body)).not.toContain("$2");
  });

  it("중복 이메일은 409 — 대소문자를 무시한다", async () => {
    await signup();
    const res = await signup({ ...signupBody, email: "NEW@Example.com", nickname: "다른닉네임" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("이미 가입된 이메일");
  });

  it("중복 닉네임은 409", async () => {
    await signup();
    const res = await signup({ ...signupBody, email: "other@example.com" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("닉네임");
  });

  it("비밀번호 8자 미만은 400", async () => {
    const res = await signup({ ...signupBody, password: "1234567" });
    expect(res.status).toBe(400);
    expect(await t.db.select().from(users)).toHaveLength(0);
  });

  it("이메일 형식 오류·닉네임 초과는 400", async () => {
    expect((await signup({ ...signupBody, email: "not-an-email" })).status).toBe(400);
    expect((await signup({ ...signupBody, nickname: "가".repeat(21) })).status).toBe(400);
  });
});

describe("로그인", () => {
  it("가입한 계정으로 로그인된다", async () => {
    await signup();
    const res = await loginRoute(
      jsonRequest(`${ORIGIN}/api/auth/login`, {
        email: signupBody.email,
        password: signupBody.password,
      }),
    );
    expect(res.status).toBe(200);
    expect(sessionCookieOf(res)).toBeTruthy();
  });

  it("비밀번호가 틀리면 401이고, 계정 존재 여부를 드러내지 않는다", async () => {
    await signup();
    const wrongPassword = await loginRoute(
      jsonRequest(`${ORIGIN}/api/auth/login`, { email: signupBody.email, password: "틀린비밀번호" }),
    );
    const noSuchUser = await loginRoute(
      jsonRequest(`${ORIGIN}/api/auth/login`, { email: "nobody@example.com", password: "whatever" }),
    );
    expect(wrongPassword.status).toBe(401);
    expect(noSuchUser.status).toBe(401);
    expect((await wrongPassword.json()).error).toBe((await noSuchUser.json()).error);
  });

  it("제재된 계정은 403과 안내 문구를 받는다", async () => {
    await signup();
    await t.db.update(users).set({ status: "suspended" }).where(eq(users.email, signupBody.email));
    const res = await loginRoute(
      jsonRequest(`${ORIGIN}/api/auth/login`, {
        email: signupBody.email,
        password: signupBody.password,
      }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain("제재된 계정이에요");
  });

  it("시드 유저 800명(더미 해시)은 로그인할 수 없다", async () => {
    await t.db.insert(users).values({
      email: "u0001@seed.theta.demo",
      nickname: "시드유저",
      passwordHash: "!seed",
      isSeed: true,
    });
    for (const password of ["!seed", "theta-demo", ""]) {
      const res = await loginRoute(
        jsonRequest(`${ORIGIN}/api/auth/login`, { email: "u0001@seed.theta.demo", password }),
      );
      expect(res.status).toBe(401);
    }
  });

  it("로그인 시 last_active_at이 갱신된다", async () => {
    await signup();
    await t.db
      .update(users)
      .set({ lastActiveAt: new Date("2020-01-01") })
      .where(eq(users.email, signupBody.email));
    await loginRoute(
      jsonRequest(`${ORIGIN}/api/auth/login`, {
        email: signupBody.email,
        password: signupBody.password,
      }),
    );
    const [u] = await t.db.select().from(users).where(eq(users.email, signupBody.email));
    expect(u!.lastActiveAt.getFullYear()).toBeGreaterThan(2020);
  });
});

describe("세션 수명", () => {
  it("로그아웃하면 세션 행이 사라지고 me는 401", async () => {
    const token = sessionCookieOf(await signup())!;

    const before = await meRoute(getRequest(`${ORIGIN}/api/auth/me`, { [SESSION_COOKIE]: token }));
    expect(before.status).toBe(200);

    const out = await logoutRoute(
      jsonRequest(`${ORIGIN}/api/auth/logout`, {}, { cookies: { [SESSION_COOKIE]: token } }),
    );
    expect(sessionCookieOf(out)).toBe("");
    expect(await t.db.select().from(sessions).where(eq(sessions.token, token))).toHaveLength(0);

    const after = await meRoute(getRequest(`${ORIGIN}/api/auth/me`, { [SESSION_COOKIE]: token }));
    expect(after.status).toBe(401);
  });

  it("만료된 세션은 거부되고 그 자리에서 정리된다", async () => {
    const token = sessionCookieOf(await signup())!;
    await t.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.token, token));

    const res = await meRoute(getRequest(`${ORIGIN}/api/auth/me`, { [SESSION_COOKIE]: token }));
    expect(res.status).toBe(401);
    expect(await t.db.select().from(sessions).where(eq(sessions.token, token))).toHaveLength(0);
  });

  it("쿠키가 없으면 me는 401", async () => {
    expect((await meRoute(getRequest(`${ORIGIN}/api/auth/me`))).status).toBe(401);
  });
});

describe("시드 데모 계정", () => {
  beforeEach(async () => {
    await seed(t.db);
  }, 120_000);

  it("데모 계정 3종은 문서화된 비밀번호로 원클릭 로그인된다", async () => {
    for (const id of ["demo-new", "demo-heavy", "demo-creator"]) {
      const res = await loginRoute(
        jsonRequest(`${ORIGIN}/api/auth/login`, {
          email: demoEmail(id),
          password: DEMO_PASSWORD,
        }),
      );
      expect(res.status, id).toBe(200);
      expect(sessionCookieOf(res)).toBeTruthy();
    }
  });

  it("시드 유저 800명 중 아무나 골라도 로그인되지 않는다", async () => {
    const [someone] = await t.db
      .select({ email: users.email })
      .from(users)
      .where(sql`${users.email} like '%@seed.theta.demo'`)
      .limit(1);
    const res = await loginRoute(
      jsonRequest(`${ORIGIN}/api/auth/login`, {
        email: someone!.email,
        password: DEMO_PASSWORD,
      }),
    );
    expect(res.status).toBe(401);
  });
});
