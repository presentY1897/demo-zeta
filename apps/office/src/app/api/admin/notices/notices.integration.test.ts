import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@theta/db/testing";
import { notices } from "@theta/db";
import { listNotices } from "@theta/db/notices";
import { POST as createRoute } from "./route";
import { PATCH as patchRoute, DELETE as deleteRoute } from "./[id]/route";
import { apiRequest, routeContext } from "@/server/testing";

let t: TestDb;

const ORIGIN = "http://localhost:3001";
const LIST = `${ORIGIN}/api/admin/notices`;
const detail = (id: string) => `${ORIGIN}/api/admin/notices/${id}`;
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

const newNotice = { category: "공지", title: "점검 안내", body: "9월 2일 새벽 점검이 있어요." };

beforeAll(async () => {
  t = await createTestDb();
}, 120_000);

afterAll(async () => {
  await t?.close();
});

beforeEach(async () => {
  await t.reset();
});

async function create(body: unknown = newNotice) {
  return createRoute(apiRequest(LIST, { method: "POST", body, admin: true }));
}

/** 시드 공지 대신 날짜를 지정한 공지를 직접 넣는다 — 정렬을 확정적으로 만든다 */
async function insert(
  values: { title: string; day: string; pinned?: boolean; category?: "공지" | "업데이트" | "이벤트" },
) {
  const [row] = await t.db
    .insert(notices)
    .values({
      category: values.category ?? "공지",
      title: values.title,
      body: `${values.title} 본문`,
      pinned: values.pinned ?? false,
      publishedAt: new Date(`${values.day}T00:00:00+09:00`),
    })
    .returning();
  return row!;
}

describe("공지 작성", () => {
  it("admin이면 공지가 생기고 목록 맨 앞에 온다", async () => {
    await insert({ title: "지난 공지", day: "2026-07-08" });

    const res = await create();
    expect(res.status).toBe(201);
    const { notice } = (await res.json()) as { notice: { id: string; title: string } };
    expect(notice.title).toBe("점검 안내");

    const rows = await listNotices(t.db);
    expect(rows.map((n) => n.title)).toEqual(["점검 안내", "지난 공지"]);
    expect(rows[0]!.pinned).toBe(false);
    // published_at은 서버 시각 — 새 공지는 오늘로 찍힌다
    expect(Date.now() - rows[0]!.publishedAt.getTime()).toBeLessThan(60_000);
  });

  it("제목 60자는 통과하고 61자는 400", async () => {
    const ok = await create({ ...newNotice, title: "가".repeat(60) });
    expect(ok.status).toBe(201);

    const tooLong = await create({ ...newNotice, title: "가".repeat(61) });
    expect(tooLong.status).toBe(400);
    expect((await tooLong.json()).error).toContain("60자");
    expect(await listNotices(t.db)).toHaveLength(1);
  });

  it("본문 1,000자는 통과하고 1,001자는 400", async () => {
    const ok = await create({ ...newNotice, body: "나".repeat(1000) });
    expect(ok.status).toBe(201);

    const tooLong = await create({ ...newNotice, body: "나".repeat(1001) });
    expect(tooLong.status).toBe(400);
    expect((await tooLong.json()).error).toContain("1,000자");
    expect(await listNotices(t.db)).toHaveLength(1);
  });

  it("카테고리·빈 제목·빈 본문은 400", async () => {
    expect((await create({ ...newNotice, category: "잡담" })).status).toBe(400);
    expect((await create({ ...newNotice, category: undefined })).status).toBe(400);
    expect((await create({ ...newNotice, title: "   " })).status).toBe(400);
    expect((await create({ ...newNotice, body: "" })).status).toBe(400);
    expect(await listNotices(t.db)).toHaveLength(0);
  });

  it("본문이 JSON이 아니면 400", async () => {
    const res = await createRoute(apiRequest(LIST, { method: "POST", body: "not-json", admin: true }));
    expect(res.status).toBe(400);
  });
});

describe("공지 고정 토글", () => {
  it("pinned를 켜고 다시 끌 수 있다", async () => {
    const created = await insert({ title: "고정할 공지", day: "2026-08-20" });

    const on = await patchRoute(
      apiRequest(detail(created.id), { method: "PATCH", body: { pinned: true }, admin: true }),
      routeContext({ id: created.id }),
    );
    expect(on.status).toBe(200);
    expect(((await on.json()) as { notice: { pinned: boolean } }).notice.pinned).toBe(true);

    const off = await patchRoute(
      apiRequest(detail(created.id), { method: "PATCH", body: { pinned: false }, admin: true }),
      routeContext({ id: created.id }),
    );
    expect(off.status).toBe(200);
    const [row] = await listNotices(t.db);
    expect(row!.pinned).toBe(false);
  });

  it("pinned가 불리언이 아니면 400", async () => {
    const created = await insert({ title: "고정할 공지", day: "2026-08-20" });
    const res = await patchRoute(
      apiRequest(detail(created.id), { method: "PATCH", body: { pinned: "yes" }, admin: true }),
      routeContext({ id: created.id }),
    );
    expect(res.status).toBe(400);
  });

  it("없는 id·uuid가 아닌 id는 404 (DB 오류가 새지 않는다)", async () => {
    for (const id of [MISSING_ID, "not-a-uuid"]) {
      const res = await patchRoute(
        apiRequest(detail(id), { method: "PATCH", body: { pinned: true }, admin: true }),
        routeContext({ id }),
      );
      expect(res.status, id).toBe(404);
    }
  });
});

describe("공지 삭제", () => {
  it("삭제하면 목록에서 사라진다", async () => {
    const a = await insert({ title: "남는 공지", day: "2026-08-20" });
    const b = await insert({ title: "지울 공지", day: "2026-08-21" });

    const res = await deleteRoute(
      apiRequest(detail(b.id), { method: "DELETE", admin: true }),
      routeContext({ id: b.id }),
    );
    expect(res.status).toBe(200);

    const rows = await listNotices(t.db);
    expect(rows.map((n) => n.id)).toEqual([a.id]);
  });

  it("없는 id는 404", async () => {
    const res = await deleteRoute(
      apiRequest(detail(MISSING_ID), { method: "DELETE", admin: true }),
      routeContext({ id: MISSING_ID }),
    );
    expect(res.status).toBe(404);
  });
});

describe("비인증 차단", () => {
  it("admin 쿠키 없이는 작성·고정·삭제가 전부 401이고 DB가 그대로다", async () => {
    const created = await insert({ title: "그대로 있어야 할 공지", day: "2026-08-20" });

    const post = await createRoute(apiRequest(LIST, { method: "POST", body: newNotice }));
    const patch = await patchRoute(
      apiRequest(detail(created.id), { method: "PATCH", body: { pinned: true } }),
      routeContext({ id: created.id }),
    );
    const del = await deleteRoute(
      apiRequest(detail(created.id), { method: "DELETE" }),
      routeContext({ id: created.id }),
    );

    expect([post.status, patch.status, del.status]).toEqual([401, 401, 401]);

    const rows = await listNotices(t.db);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.pinned).toBe(false);
  });

  it("위조된 admin 쿠키도 401", async () => {
    const res = await createRoute(
      new Request(LIST, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "theta_admin=9999999999999.forged" },
        body: JSON.stringify(newNotice),
      }),
    );
    expect(res.status).toBe(401);
    expect(await listNotices(t.db)).toHaveLength(0);
  });
});
