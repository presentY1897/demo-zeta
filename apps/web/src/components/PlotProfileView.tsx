"use client";

import Link from "next/link";
import { Spinner } from "@theta/ui";
import { PlotCover } from "@/components/PlotCover";
import { PlotNotFound } from "@/components/PlotNotFound";
import { formatCount } from "@/lib/format";
import { josa } from "@/lib/josa";
import { usePlot } from "@/lib/plots";

/** 정적/유저 생성 플롯을 클라이언트에서 해석해 프로필을 렌더링 */
export function PlotProfileView({ id }: { id: string }) {
  const lookup = usePlot(id);

  if (lookup.status === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }
  if (lookup.status === "missing") return <PlotNotFound />;

  const { plot, mine } = lookup;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="overflow-hidden rounded-card border border-line">
        <PlotCover plot={plot} className="h-52" emojiClassName="text-7xl" />
        <div className="space-y-3 bg-surface p-5">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold">
              {plot.name}
              {mine && (
                <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold text-primary">
                  내 플롯
                </span>
              )}
            </h1>
            <p className="mt-0.5 text-sm text-text-sub">{plot.tagline}</p>
          </div>
          <p className="text-[12px] text-text-faint">
            @{plot.creator} · 💬 {formatCount(plot.chats)} · ❤️{" "}
            {formatCount(plot.likes)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {plot.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] text-text-sub"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-text-sub">소개</h2>
        <p className="text-[15px] leading-relaxed">{plot.description}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-text-sub">첫 메시지</h2>
        <div className="whitespace-pre-line rounded-card border border-line bg-surface p-4 text-sm leading-relaxed text-text-sub">
          {plot.firstMessage}
        </div>
      </section>

      <div className="sticky bottom-16 pt-2 sm:bottom-4">
        <Link
          href={`/chat/${plot.id}`}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-strong"
        >
          {plot.name}
          {josa(plot.name, "과", "와")} 대화 시작하기
        </Link>
      </div>
    </div>
  );
}
