"use client";

import Link from "next/link";
import { Spinner } from "@theta/ui";
import { useAllPlots } from "@/lib/plots";
import { useUserPlotsStore } from "@/lib/user-plots";
import { useChatStore } from "@/lib/chat-store";
import { PlotAvatar } from "@/components/chat/PlotAvatar";

export default function MyPlotsPage() {
  const { hydrated, mine } = useAllPlots();
  const removePlot = useUserPlotsStore((s) => s.removePlot);

  function remove(id: string, name: string) {
    if (!window.confirm(`"${name}" 플롯을 삭제할까요? 대화 기록도 함께 사라져요.`)) {
      return;
    }
    removePlot(id);
    // 해당 플롯의 대화방도 함께 정리
    useChatStore.setState((s) => {
      const { [id]: _removed, ...rest } = s.rooms;
      return { rooms: rest };
    });
  }

  if (!hydrated) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <Link
          href="/my"
          className="text-sm text-text-faint underline underline-offset-4 hover:text-text-sub"
        >
          ← MY
        </Link>
        <h1 className="mt-2 text-lg font-extrabold">내가 만든 플롯</h1>
      </div>

      {mine.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface py-16 text-center">
          <span className="text-4xl" aria-hidden>
            ✍️
          </span>
          <p className="text-sm text-text-sub">아직 만든 플롯이 없어요.</p>
          <Link
            href="/create"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
          >
            첫 플롯 만들기
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {mine.map((plot) => (
            <li key={plot.id} className="flex items-center gap-3 p-4">
              <PlotAvatar plot={plot} size={44} />
              <div className="min-w-0 flex-1">
                <Link href={`/plots/${plot.id}`} className="hover:underline">
                  <p className="truncate text-[15px] font-bold">{plot.name}</p>
                </Link>
                <p className="truncate text-[13px] text-text-sub">
                  {plot.tagline}
                </p>
              </div>
              <Link
                href={`/chat/${plot.id}`}
                className="shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-text transition-colors hover:bg-line"
              >
                대화
              </Link>
              <button
                type="button"
                onClick={() => remove(plot.id, plot.name)}
                className="shrink-0 rounded-lg bg-danger/15 px-3 py-1.5 text-[13px] font-medium text-danger transition-colors hover:bg-danger/25"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
