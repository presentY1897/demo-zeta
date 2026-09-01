import { desc, eq } from "drizzle-orm";
import type { Database } from "./client";
import { notices, type Notice } from "./schema";

/**
 * 공지 조회 — 오피스와 web이 같은 함수를 써서 목록 순서·고정 배너 선택이 항상 일치한다.
 * (쓰기는 오피스의 admin API에만 있다)
 */

export const NOTICE_CATEGORIES = ["공지", "업데이트", "이벤트"] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export const NOTICE_TITLE_MAX = 60;
export const NOTICE_BODY_MAX = 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 게시일 최신순. 같은 시각이면 id로 갈라 순서가 흔들리지 않게 한다. */
export function listNotices(db: Database): Promise<Notice[]> {
  return db.select().from(notices).orderBy(desc(notices.publishedAt), desc(notices.id));
}

/** 없는 id는 물론, uuid 형식이 아닌 id도 예외 없이 undefined (상세 페이지의 404 경로) */
export async function getNoticeById(db: Database, id: string): Promise<Notice | undefined> {
  if (!UUID_RE.test(id)) return undefined;
  const rows = await db.select().from(notices).where(eq(notices.id, id)).limit(1);
  return rows[0];
}

/** 홈 배너용 — 고정 공지가 여럿이면 목록 순서의 첫 건 (기존 동작 유지) */
export async function getPinnedNotice(db: Database): Promise<Notice | undefined> {
  const rows = await db
    .select()
    .from(notices)
    .where(eq(notices.pinned, true))
    .orderBy(desc(notices.publishedAt), desc(notices.id))
    .limit(1);
  return rows[0];
}

/** 화면 표기용 KST 날짜 (YYYY-MM-DD) — 시드 공지의 기존 표기와 같은 형식 */
export function noticeDate(publishedAt: Date): string {
  return new Date(publishedAt.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** RSC → 클라이언트 컴포넌트 경계로 넘기는 평평한 형태 (Date 대신 표기용 문자열) */
export interface NoticeView {
  id: string;
  category: NoticeCategory;
  title: string;
  body: string;
  pinned: boolean;
  date: string;
}

export function toNoticeView(notice: Notice): NoticeView {
  return {
    id: notice.id,
    category: notice.category,
    title: notice.title,
    body: notice.body,
    pinned: notice.pinned,
    date: noticeDate(notice.publishedAt),
  };
}
