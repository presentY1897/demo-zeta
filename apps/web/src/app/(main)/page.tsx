import Link from "next/link";
import { featuredTags, notices } from "@theta/mocks";
import { db } from "@theta/db";
import { PlotCard } from "@/components/PlotCard";
import { TagFilter } from "@/components/TagFilter";
import { getCurrentUser } from "@/server/auth/current-user";
import { listPlots } from "@/server/plots/queries";

// 로그인 유저의 비공개 플롯 노출 여부가 요청마다 달라지므로 캐시하지 않는다
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const [{ tag }, user] = await Promise.all([searchParams, getCurrentUser()]);
  const activeTag = tag?.trim() ? tag.trim() : null;
  // 유저가 직접 만든 태그로 필터가 걸리면 칩 목록에 그 태그도 끼워 넣어 선택 상태를 보여준다
  const chips: string[] =
    activeTag && !(featuredTags as readonly string[]).includes(activeTag)
      ? [activeTag, ...featuredTags]
      : [...featuredTags];
  const plots = await listPlots(db, { viewerId: user?.id ?? null, tag: activeTag });

  const pinned = notices.find((n) => n.pinned);

  return (
    <div className="space-y-4">
      {pinned && (
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
      )}

      <TagFilter tags={chips} active={activeTag} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {plots.map((plot) => (
          <PlotCard key={plot.id} plot={plot} mine={plot.mine} />
        ))}
      </div>

      {plots.length === 0 && (
        <p className="py-16 text-center text-sm text-text-faint">
          해당 태그의 플롯이 아직 없어요.
        </p>
      )}
    </div>
  );
}
