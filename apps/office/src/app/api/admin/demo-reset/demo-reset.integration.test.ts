import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { plots, notices, users } from "@theta/db";
import { createTestDb, type TestDb } from "@theta/db/testing";
import { POST as resetRoute } from "./route";
import { ADMIN_COOKIE, issueAdminToken } from "@/server/admin-auth";

const URL = "http://localhost:3001/api/admin/demo-reset";

let t: TestDb;

function request(authenticated: boolean): Request {
  const headers = new Headers();
  if (authenticated) {
    const { token } = issueAdminToken();
    headers.set("cookie", `${ADMIN_COOKIE}=${encodeURIComponent(token)}`);
  }
  return new Request(URL, { method: "POST", headers });
}

beforeAll(async () => {
  t = await createTestDb();
}, 120_000);

afterAll(async () => {
  await t?.close();
});

beforeEach(async () => {
  await t.reset();
});

describe("데모 초기화", () => {
  it("빈 DB를 시드 직후 상태로 채운다", async () => {
    const res = await resetRoute(request(true));
    expect(res.status).toBe(200);

    const { counts } = (await res.json()) as { counts: Record<string, number> };
    expect(counts).toEqual({
      plots: 12,
      users: 804,
      notices: 5,
      daily_metrics: 90,
      experiments: 3,
    });
  }, 120_000);

  it("흐트러진 데이터를 되돌린다 — 실가입 계정과 삭제된 공지가 정리된다", async () => {
    await resetRoute(request(true));

    // 데모가 어질러진 상황을 만든다
    await t.db.insert(users).values({ email: "stranger@example.com", nickname: "지나가던사람" });
    await t.db.delete(notices);
    await t.db.delete(plots).where(eq(plots.id, "seojun-contract"));

    const res = await resetRoute(request(true));
    expect(res.status).toBe(200);

    expect(await t.db.select().from(users).where(eq(users.email, "stranger@example.com"))).toHaveLength(0);
    expect(await t.db.select().from(notices)).toHaveLength(5);
    expect(await t.db.select().from(plots).where(eq(plots.id, "seojun-contract"))).toHaveLength(1);
  }, 120_000);

  it("비인증 요청은 401이고 아무것도 바뀌지 않는다", async () => {
    const res = await resetRoute(request(false));
    expect(res.status).toBe(401);
    expect(await t.db.select().from(users)).toHaveLength(0);
  });
});
