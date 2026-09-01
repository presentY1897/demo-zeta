import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { images, plots, users, type Database } from "@theta/db";
import { createTestDb, type TestDb } from "@theta/db/testing";
import { GET as imageRoute } from "@/app/api/images/[id]/route";
import { POST as uploadRoute } from "@/app/api/uploads/route";
import { POST as createPlotRoute } from "@/app/api/plots/route";
import { GET as getPlotRoute } from "@/app/api/plots/[id]/route";
import { issueSession, SESSION_COOKIE } from "@/server/auth/session";
import { getRequest, jsonRequest } from "@/server/auth/testing";
import { COVER_LIMITS } from "@/lib/cover-limits";
import type { PlotView } from "@/lib/plot-view";
import { fakeImageBytes, imageFixture, FIXTURE_SIZE } from "./fixtures";

const ORIGIN = "http://localhost:3000";

let t: TestDb;
let owner: Account;
let stranger: Account;

interface Account {
  id: string;
  cookie: Record<string, string>;
}

const validDraft = {
  name: "커버 테스트",
  tagline: "한 줄 소개",
  description: "세계관 소개",
  persona: "성격과 말투",
  firstMessage: "*문을 연다* 안녕.",
  tags: ["로맨스"],
  emoji: "🌙",
  gradient: ["#2b2d5e", "#7a68f5"],
  visibility: "public" as const,
};

async function makeUser(db: Database, nickname: string, suspended = false): Promise<Account> {
  const [user] = await db
    .insert(users)
    .values({
      email: `${nickname}@example.com`,
      nickname,
      status: suspended ? "suspended" : "active",
    })
    .returning();
  const session = await issueSession(db, user!.id);
  return { id: user!.id, cookie: { [SESSION_COOKIE]: session.token } };
}

/** multipart 요청은 FormData를 그대로 Request에 실으면 undici가 경계까지 만들어 준다 */
function uploadRequest(
  bytes: Uint8Array | null,
  options: { cookie?: Record<string, string>; filename?: string; type?: string } = {},
): Request {
  const form = new FormData();
  if (bytes) {
    form.set(
      "file",
      new File([new Uint8Array(bytes)], options.filename ?? "cover.webp", {
        type: options.type ?? "image/webp",
      }),
    );
  }
  const headers = new Headers();
  if (options.cookie) {
    headers.set(
      "cookie",
      Object.entries(options.cookie)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("; "),
    );
  }
  return new Request(`${ORIGIN}/api/uploads`, { method: "POST", headers, body: form });
}

async function upload(bytes: Uint8Array, account: Account): Promise<string> {
  const res = await uploadRoute(uploadRequest(bytes, { cookie: account.cookie }));
  expect(res.status).toBe(201);
  const body = (await res.json()) as { id: string };
  return body.id;
}

function serve(id: string, headers?: Record<string, string>): Promise<Response> {
  const req = new Request(`${ORIGIN}/api/images/${id}`, { headers });
  return imageRoute(req, { params: Promise.resolve({ id }) });
}

async function errorOf(res: Response): Promise<string> {
  const body = (await res.json()) as { error?: string };
  return body.error ?? "";
}

beforeAll(async () => {
  t = await createTestDb();
}, 120_000);

afterAll(async () => {
  await t?.close();
});

beforeEach(async () => {
  await t.reset();
  owner = await makeUser(t.db, "주인");
  stranger = await makeUser(t.db, "남");
});

describe("POST /api/uploads", () => {
  it.each(["webp", "png", "jpeg"] as const)("%s를 저장하고 id를 돌려준다", async (kind) => {
    const bytes = imageFixture(kind);
    const id = await upload(bytes, owner);

    const [row] = await t.db.select().from(images).where(eq(images.id, id));
    expect(row).toMatchObject({
      ownerId: owner.id,
      width: FIXTURE_SIZE.width,
      height: FIXTURE_SIZE.height,
    });
    // 확장자·헤더가 아니라 파일 내용으로 판정한 content-type이 저장된다
    expect(row!.contentType).toBe(kind === "webp" ? "image/webp" : `image/${kind}`);
    expect(Buffer.from(row!.bytes).equals(bytes)).toBe(true);
  });

  it("Content-Type 헤더가 거짓이어도 내용대로 판정한다", async () => {
    const id = await upload(imageFixture("png"), owner);
    const [row] = await t.db.select().from(images).where(eq(images.id, id));
    expect(row!.contentType).toBe("image/png");
  });

  it("확장자만 png인 텍스트 파일은 400으로 거부한다", async () => {
    const res = await uploadRoute(
      uploadRequest(fakeImageBytes(), {
        cookie: owner.cookie,
        filename: "cover.png",
        type: "image/png",
      }),
    );
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toContain("이미지 파일이 아니에요");
    expect(await t.db.select().from(images)).toHaveLength(0);
  });

  it("2MB를 넘으면 413이다", async () => {
    // 상한을 아주 살짝 넘겨 본문을 파싱한 뒤의 검사를 태운다
    const oversized = Buffer.concat([
      imageFixture("webp"),
      Buffer.alloc(COVER_LIMITS.maxBytes + 100 - imageFixture("webp").byteLength),
    ]);
    const res = await uploadRoute(uploadRequest(oversized, { cookie: owner.cookie }));
    expect(res.status).toBe(413);
    expect(await errorOf(res)).toContain("2.0MB까지");
  });

  it("본문이 상한을 크게 넘으면 파싱하기 전에 413이다", async () => {
    const res = await uploadRoute(
      uploadRequest(Buffer.alloc(COVER_LIMITS.maxBytes * 2), { cookie: owner.cookie }),
    );
    expect(res.status).toBe(413);
  });

  it("픽셀 상한을 넘는 이미지는 400이다", async () => {
    const res = await uploadRoute(
      uploadRequest(imageFixture("pngTooWide"), { cookie: owner.cookie }),
    );
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toContain("2000px");
  });

  it("파일 필드가 없으면 400이다", async () => {
    const res = await uploadRoute(uploadRequest(null, { cookie: owner.cookie }));
    expect(res.status).toBe(400);
  });

  it("비로그인은 401이다", async () => {
    const res = await uploadRoute(uploadRequest(imageFixture("webp")));
    expect(res.status).toBe(401);
    expect(await t.db.select().from(images)).toHaveLength(0);
  });

  it("제재된 계정은 403이다", async () => {
    const suspended = await makeUser(t.db, "정지", true);
    const res = await uploadRoute(uploadRequest(imageFixture("webp"), { cookie: suspended.cookie }));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/images/[id]", () => {
  it("바이트를 그대로 돌려주고 immutable 캐시 헤더를 붙인다", async () => {
    const bytes = imageFixture("png");
    const id = await upload(bytes, owner);

    const res = await serve(id);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("etag")).toBe(`"${id}"`);
    expect(res.headers.get("content-length")).toBe(String(bytes.byteLength));
    expect(Buffer.from(await res.arrayBuffer()).equals(bytes)).toBe(true);
  });

  it("ETag가 일치하면 304로 본문 없이 답한다", async () => {
    const id = await upload(imageFixture("png"), owner);
    const res = await serve(id, { "if-none-match": `"${id}"` });
    expect(res.status).toBe(304);
    expect(await res.text()).toBe("");
  });

  it("없는 id는 404다", async () => {
    const res = await serve("00000000-0000-4000-8000-000000000000");
    expect(res.status).toBe(404);
  });

  it("uuid가 아닌 id도 404다(DB까지 가지 않는다)", async () => {
    const res = await serve("not-a-uuid");
    expect(res.status).toBe(404);
  });

  it("로그인 없이도 볼 수 있다", async () => {
    const id = await upload(imageFixture("webp"), owner);
    expect((await serve(id)).status).toBe(200);
  });
});

describe("플롯에 커버 연결", () => {
  async function createPlot(body: Record<string, unknown>, account: Account) {
    return createPlotRoute(jsonRequest(`${ORIGIN}/api/plots`, body, { cookies: account.cookie }));
  }

  async function plotView(id: string, account?: Account): Promise<PlotView> {
    const res = await getPlotRoute(getRequest(`${ORIGIN}/api/plots/${id}`, account?.cookie), {
      params: Promise.resolve({ id }),
    });
    const body = (await res.json()) as { plot: PlotView };
    return body.plot;
  }

  it("본인이 올린 이미지는 커버로 연결된다", async () => {
    const imageId = await upload(imageFixture("webp"), owner);
    const res = await createPlot({ ...validDraft, coverImageId: imageId }, owner);
    expect(res.status).toBe(201);

    const { id } = (await res.json()) as { id: string };
    const [row] = await t.db.select().from(plots).where(eq(plots.id, id));
    expect(row!.coverImageId).toBe(imageId);
    // 화면에는 id가 아니라 서빙 URL로 내려간다
    expect((await plotView(id)).coverUrl).toBe(`/api/images/${imageId}`);
  });

  it("타인이 올린 이미지 id는 400으로 거부한다", async () => {
    const imageId = await upload(imageFixture("webp"), stranger);
    const res = await createPlot({ ...validDraft, coverImageId: imageId }, owner);
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toContain("내가 올린 커버 이미지만");
    expect(await t.db.select().from(plots)).toHaveLength(0);
  });

  it("없는 이미지 id는 타인 이미지와 똑같이 답한다(존재 여부 비노출)", async () => {
    const missing = await createPlot(
      { ...validDraft, coverImageId: "00000000-0000-4000-8000-000000000000" },
      owner,
    );
    const others = await createPlot(
      { ...validDraft, coverImageId: await upload(imageFixture("webp"), stranger) },
      owner,
    );
    expect(missing.status).toBe(others.status);
    expect(await errorOf(missing)).toBe(await errorOf(others));
  });

  it("커버를 안 올리면 coverUrl이 null이라 이모지 폴백으로 간다", async () => {
    const res = await createPlot(validDraft, owner);
    const { id } = (await res.json()) as { id: string };
    expect((await plotView(id)).coverUrl).toBeNull();
  });
});
