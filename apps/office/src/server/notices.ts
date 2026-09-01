import { eq } from "drizzle-orm";
import { notices, type Database, type Notice } from "@theta/db";
import {
  NOTICE_BODY_MAX,
  NOTICE_CATEGORIES,
  NOTICE_TITLE_MAX,
  getNoticeById,
  type NoticeCategory,
} from "@theta/db/notices";

/**
 * 공지 쓰기 코어 — 라우트 핸들러가 얇게 유지되도록 검증·DB 갱신을 여기에 모은다.
 * next/headers도 NextResponse도 쓰지 않아 통합 테스트가 그대로 호출한다.
 */

export type NoticeResult =
  | { ok: true; notice: Notice }
  | { ok: false; status: number; message: string };

const NOT_FOUND = { ok: false, status: 404, message: "공지를 찾을 수 없어요." } as const;

function isCategory(value: unknown): value is NoticeCategory {
  return NOTICE_CATEGORIES.includes(value as NoticeCategory);
}

export interface CreateNoticeInput {
  category?: unknown;
  title?: unknown;
  body?: unknown;
}

export async function createNotice(db: Database, input: CreateNoticeInput): Promise<NoticeResult> {
  if (!isCategory(input.category))
    return { ok: false, status: 400, message: "카테고리는 공지·업데이트·이벤트 중 하나여야 해요." };

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";

  if (!title) return { ok: false, status: 400, message: "제목을 입력해 주세요." };
  if (title.length > NOTICE_TITLE_MAX)
    return { ok: false, status: 400, message: `제목은 ${NOTICE_TITLE_MAX}자까지 쓸 수 있어요.` };
  if (!body) return { ok: false, status: 400, message: "내용을 입력해 주세요." };
  if (body.length > NOTICE_BODY_MAX)
    return {
      ok: false,
      status: 400,
      message: `내용은 ${NOTICE_BODY_MAX.toLocaleString("ko-KR")}자까지 쓸 수 있어요.`,
    };

  // published_at은 서버 시각 — 시드 공지의 과거 날짜는 그대로 두고 새 공지만 오늘로 찍힌다
  const [created] = await db
    .insert(notices)
    .values({ category: input.category, title, body })
    .returning();
  return { ok: true, notice: created! };
}

/** 고정 토글 — 복수 고정을 허용하는 기존 동작 그대로다 */
export async function setNoticePinned(
  db: Database,
  id: string,
  pinned: unknown,
): Promise<NoticeResult> {
  if (typeof pinned !== "boolean")
    return { ok: false, status: 400, message: "pinned는 true 또는 false여야 해요." };
  if (!(await getNoticeById(db, id))) return NOT_FOUND;

  const [updated] = await db
    .update(notices)
    .set({ pinned })
    .where(eq(notices.id, id))
    .returning();
  return updated ? { ok: true, notice: updated } : NOT_FOUND;
}

export async function deleteNotice(
  db: Database,
  id: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (!(await getNoticeById(db, id))) return NOT_FOUND;
  await db.delete(notices).where(eq(notices.id, id));
  return { ok: true };
}
