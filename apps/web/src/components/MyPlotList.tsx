"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PlotView } from "@/lib/plot-view";
import { PlotAvatar } from "@/components/chat/PlotAvatar";

export function MyPlotList({ plots }: { plots: PlotView[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(plot: PlotView) {
    if (!window.confirm(`"${plot.name}" 플롯을 삭제할까요? 대화 기록도 함께 사라져요.`)) return;
    setDeleting(plot.id);
    setError(null);
    try {
      const res = await fetch(`/api/plots/${plot.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "삭제하지 못했어요.");
        return;
      }
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger"
        >
          {error}
        </p>
      )}
      <ul className="divide-y divide-line rounded-card border border-line bg-surface">
        {plots.map((plot) => (
          <li key={plot.id} className="flex items-center gap-3 p-4">
            <PlotAvatar plot={plot} size={44} />
            <div className="min-w-0 flex-1">
              <Link href={`/plots/${plot.id}`} className="hover:underline">
                <p className="flex items-center gap-1.5 truncate text-[15px] font-bold">
                  {plot.name}
                  {plot.visibility === "private" && (
                    <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-text-sub">
                      비공개
                    </span>
                  )}
                </p>
              </Link>
              <p className="truncate text-[13px] text-text-sub">{plot.tagline}</p>
            </div>
            <Link
              href={`/chat/${plot.id}`}
              className="shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-text transition-colors hover:bg-line"
            >
              대화
            </Link>
            <button
              type="button"
              disabled={deleting === plot.id}
              onClick={() => void remove(plot)}
              className="shrink-0 rounded-lg bg-danger/15 px-3 py-1.5 text-[13px] font-medium text-danger transition-colors hover:bg-danger/25 disabled:opacity-50"
            >
              {deleting === plot.id ? "삭제 중" : "삭제"}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
