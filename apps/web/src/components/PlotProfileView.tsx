import Link from "next/link";
import { PlotCover } from "@/components/PlotCover";
import { formatCount } from "@/lib/format";
import { josa } from "@/lib/josa";
import type { PlotView } from "@/lib/plot-view";

/** 서버에서 해석된 플롯을 렌더링한다(접근 권한 판정은 페이지에서 끝나 있다) */
export function PlotProfileView({ plot }: { plot: PlotView }) {
  const mine = plot.mine;

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
              {plot.visibility === "private" && (
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-text-sub">
                  비공개
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
