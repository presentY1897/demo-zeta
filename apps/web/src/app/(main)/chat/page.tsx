"use client";

import Link from "next/link";
import { getPlot } from "@theta/mocks";
import { Spinner } from "@theta/ui";
import { useChatRooms } from "@/lib/chat-store";
import { formatRelativeTime } from "@/lib/time";
import { PlotAvatar } from "@/components/chat/PlotAvatar";

/** 마지막 메시지 미리보기 — 지문 별표와 줄바꿈 제거 */
function preview(content: string): string {
  return content.replace(/\*/g, "").replace(/\s+/g, " ").trim().slice(0, 48);
}

export default function ChatListPage() {
  const rooms = useChatRooms();

  if (rooms === null) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const entries = Object.values(rooms)
    .map((room) => ({ room, plot: getPlot(room.plotId) }))
    .filter((e) => e.plot !== undefined)
    .sort((a, b) => b.room.updatedAt - a.room.updatedAt);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-lg font-extrabold">대화</h1>

      {entries.length === 0 ? (
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
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {entries.map(({ room, plot }) => {
            const last = room.messages[room.messages.length - 1];
            return (
              <li key={room.plotId}>
                <Link
                  href={`/chat/${room.plotId}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2"
                >
                  <PlotAvatar plot={plot!} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold">{plot!.name}</p>
                    <p className="truncate text-[13px] text-text-sub">
                      {last ? preview(last.content) : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-text-faint">
                    {formatRelativeTime(room.updatedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
