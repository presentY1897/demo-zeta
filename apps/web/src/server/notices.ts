import { notFound } from "next/navigation";
import { db } from "@theta/db";
import {
  getNoticeById,
  getPinnedNotice,
  listNotices,
  toNoticeView,
  type NoticeView,
} from "@theta/db/notices";

/**
 * 공지 화면(RSC)이 쓰는 조회 — 오피스가 쓴 그대로를 같은 DB에서 읽는다.
 * 조회 함수는 @theta/db/notices에 있고 여기서는 싱글턴 db와 404 처리만 얹는다.
 */

export function loadNotices(): Promise<NoticeView[]> {
  return listNotices(db).then((rows) => rows.map(toNoticeView));
}

export async function loadNoticeOr404(id: string): Promise<NoticeView> {
  const notice = await getNoticeById(db, id);
  if (!notice) notFound();
  return toNoticeView(notice);
}

/** 홈 고정 배너 — 고정 공지가 없으면 배너를 띄우지 않는다 */
export async function loadPinnedNotice(): Promise<NoticeView | null> {
  const notice = await getPinnedNotice(db);
  return notice ? toNoticeView(notice) : null;
}
