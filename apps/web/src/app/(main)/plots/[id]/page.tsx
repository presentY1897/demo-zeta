import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlot, plots } from "@theta/mocks";
import { PlotCover } from "@/components/PlotCover";
import { formatCount } from "@/lib/format";

export function generateStaticParams() {
  return plots.map((p) => ({ id: p.id }));
}

export default async function PlotProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plot = getPlot(id);
  if (!plot) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="overflow-hidden rounded-card border border-line">
        <PlotCover plot={plot} className="h-52" emojiClassName="text-7xl" />
        <div className="space-y-3 bg-surface p-5">
          <div>
            <h1 className="text-xl font-extrabold">{plot.name}</h1>
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
        <div className="rounded-card border border-line bg-surface p-4 text-sm leading-relaxed text-text-sub whitespace-pre-line">
          {plot.firstMessage}
        </div>
      </section>

      <div className="sticky bottom-16 pt-2 sm:bottom-4">
        <Link
          href={`/chat/${plot.id}`}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-strong"
        >
          {plot.name}와(과) 대화 시작하기
        </Link>
      </div>
    </div>
  );
}
