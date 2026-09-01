import { featuredTags } from "@theta/mocks";
import { db } from "@theta/db";
import { PlotCard } from "@/components/PlotCard";
import { PinnedNoticeBanner } from "@/components/PinnedNoticeBanner";
import { TagFilter } from "@/components/TagFilter";
import { getCurrentUser } from "@/server/auth/current-user";
import { listPlots } from "@/server/plots/queries";

// 비공개 플롯 노출 여부와 고정 공지가 요청마다 달라지므로 캐시하지 않는다
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

  return (
    <div className="space-y-4">
      <PinnedNoticeBanner />

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
