import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@theta/db/testing";
import { notices, stableUuid } from "@theta/db";
import { seed } from "@theta/db/seed";
import { loadNoticeOr404, loadNotices, loadPinnedNotice } from "./notices";

let t: TestDb;

/** notFound()가 던지는 에러의 표식 — 상세 페이지가 404로 렌더된다는 뜻 */
const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

beforeAll(async () => {
  t = await createTestDb();
}, 120_000);

afterAll(async () => {
  await t?.close();
});

beforeEach(async () => {
  await t.reset();
});

async function insert(values: { title: string; day: string; pinned?: boolean }) {
  const [row] = await t.db
    .insert(notices)
    .values({
      category: "공지",
      title: values.title,
      body: `${values.title} 본문`,
      pinned: values.pinned ?? false,
      publishedAt: new Date(`${values.day}T00:00:00+09:00`),
    })
    .returning();
  return row!;
}

describe("공지 목록", () => {
  it("게시일 최신순으로 내려온다", async () => {
    await insert({ title: "7월 공지", day: "2026-07-08" });
    await insert({ title: "8월 공지", day: "2026-08-28" });
    await insert({ title: "6월 공지", day: "2026-06-01" });

    const rows = await loadNotices();
    expect(rows.map((n) => n.title)).toEqual(["8월 공지", "7월 공지", "6월 공지"]);
    // 날짜는 KST 기준 YYYY-MM-DD로 표기된다
    expect(rows[0]!.date).toBe("2026-08-28");
  });

  it("공지가 없으면 빈 목록", async () => {
    expect(await loadNotices()).toEqual([]);
  });
});

describe("공지 상세", () => {
  it("있는 공지는 본문까지 그대로 읽는다", async () => {
    const created = await insert({ title: "정기 점검", day: "2026-08-10" });
    const notice = await loadNoticeOr404(created.id);
    expect(notice.title).toBe("정기 점검");
    expect(notice.body).toBe("정기 점검 본문");
    expect(notice.date).toBe("2026-08-10");
  });

  it("없는 id와 uuid가 아닌 id는 404", async () => {
    for (const id of [MISSING_ID, "n-2026-08-mymodel", "not-a-uuid"]) {
      await expect(loadNoticeOr404(id), id).rejects.toMatchObject({ digest: NOT_FOUND_DIGEST });
    }
  });

  it("삭제된 공지의 상세 URL은 404가 된다", async () => {
    const created = await insert({ title: "곧 삭제될 공지", day: "2026-08-10" });
    await expect(loadNoticeOr404(created.id)).resolves.toBeTruthy();

    await t.db.delete(notices);
    await expect(loadNoticeOr404(created.id)).rejects.toMatchObject({ digest: NOT_FOUND_DIGEST });
  });
});

describe("홈 고정 배너", () => {
  it("고정 공지가 없으면 배너가 없다", async () => {
    await insert({ title: "고정 아님", day: "2026-08-10" });
    expect(await loadPinnedNotice()).toBeNull();
  });

  it("고정이 여럿이면 목록 순서(최신)의 첫 건을 고른다", async () => {
    await insert({ title: "옛 고정 공지", day: "2026-07-01", pinned: true });
    await insert({ title: "새 고정 공지", day: "2026-08-28", pinned: true });
    await insert({ title: "가장 최신이지만 고정 아님", day: "2026-08-31" });

    const pinned = await loadPinnedNotice();
    expect(pinned?.title).toBe("새 고정 공지");
  });

  it("고정을 해제하면 배너도 바뀐다", async () => {
    const newer = await insert({ title: "새 고정 공지", day: "2026-08-28", pinned: true });
    await insert({ title: "옛 고정 공지", day: "2026-07-01", pinned: true });

    expect((await loadPinnedNotice())?.title).toBe("새 고정 공지");
    await t.db.update(notices).set({ pinned: false });
    expect(await loadPinnedNotice()).toBeNull();
    await t.db.update(notices).set({ pinned: true });
    expect((await loadPinnedNotice())?.id).toBe(newer.id);
  });
});

describe("시드 공지", () => {
  beforeEach(async () => {
    await seed(t.db);
  }, 120_000);

  it("5건이 최신순으로 보이고 고정 배너는 '내 AI 연결' 공지다", async () => {
    const rows = await loadNotices();
    expect(rows).toHaveLength(5);
    expect(rows.map((n) => n.date)).toEqual([
      "2026-08-28",
      "2026-08-14",
      "2026-08-05",
      "2026-07-21",
      "2026-07-08",
    ]);

    const pinned = await loadPinnedNotice();
    expect(pinned?.title).toContain("내 AI 연결");
    // 시드 uuid는 이름 기반 고정값 — 재시드에도 공지 URL이 유지된다
    expect(pinned?.id).toBe(stableUuid("notice:n-2026-08-mymodel"));
    await expect(loadNoticeOr404(pinned!.id)).resolves.toMatchObject({ id: pinned!.id });
  });
});
