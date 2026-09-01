import { cn } from "@theta/ui";
import { COVER_LIMITS } from "@/lib/cover-limits";
import type { PlotView } from "@/lib/plot-view";

/**
 * 플롯 커버 — 업로드한 이미지가 있으면 그것을, 없으면 그라디언트+이모지를 그린다.
 * 홈 카드·프로필 헤더·위저드 미리보기가 전부 여기를 거치므로 폴백 경로가 한 곳에만 있다.
 */
export function PlotCover({
  plot,
  className,
  emojiClassName,
}: {
  plot: PlotView;
  className?: string;
  emojiClassName?: string;
}) {
  if (plot.coverUrl) {
    return (
      <div className={cn("overflow-hidden bg-surface-2", className)}>
        {/* width/height를 박아 이미지가 늦게 와도 레이아웃이 밀리지 않는다 */}
        <img
          src={plot.coverUrl}
          alt={plot.name}
          width={COVER_LIMITS.targetWidth}
          height={COVER_LIMITS.targetHeight}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn("flex items-center justify-center", className)}
      style={{
        background: `linear-gradient(160deg, ${plot.gradient[0]}, ${plot.gradient[1]})`,
      }}
    >
      <span className={cn("text-5xl drop-shadow-lg", emojiClassName)}>
        {plot.emoji}
      </span>
    </div>
  );
}
