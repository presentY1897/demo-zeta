import Link from "next/link";
import type { RoomSummary } from "@/lib/chat-types";
import { formatRelativeTime } from "@/lib/time";
import { PlotAvatar } from "./PlotAvatar";

/** 마지막 메시지 미리보기 — 지문 별표와 줄바꿈 제거 */
function preview(content: string): string {
  return content.replace(/\*/g, "").replace(/\s+/g, " ").trim().slice(0, 48);
}

export function ChatRoomList({ rooms }: { rooms: RoomSummary[] }) {
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface py-16 text-center">
        <span className="text-4xl" aria-hidden>
          💬
        </span>
        <p className="text-sm text-text-sub">아직 시작한 대화가 없어요.</p>
        <Link
          href="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
        >
          마음에 드는 캐릭터 찾아보기
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-card border border-line bg-surface">
      {rooms.map((room) => (
        <li key={room.id}>
          <Link
            href={`/chat/${room.plotId}`}
            className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2"
          >
            <PlotAvatar
              plot={{ emoji: room.emoji, gradient: room.gradient }}
              size={44}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold">{room.plotName}</p>
              <p className="truncate text-[13px] text-text-sub">
                {room.lastMessage ? preview(room.lastMessage) : ""}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-text-faint">
              {formatRelativeTime(room.updatedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
