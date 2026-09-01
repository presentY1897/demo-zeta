import Link from "next/link";
import { loadPinnedNotice } from "@/server/notices";

/** 홈 상단 고정 공지 배너 — 오피스에서 고정한 공지를 DB에서 그대로 읽는다 */
export async function PinnedNoticeBanner() {
  const pinned = await loadPinnedNotice();
  if (!pinned) return null;

  return (
    <Link
      href={`/notices/${pinned.id}`}
      className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-4 py-2.5 text-[13px] text-text-sub transition-colors hover:border-primary/60"
    >
      <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">
        {pinned.category}
      </span>
      <span className="line-clamp-1 flex-1">{pinned.title}</span>
      <span aria-hidden className="text-text-faint">
        ›
      </span>
    </Link>
  );
}
