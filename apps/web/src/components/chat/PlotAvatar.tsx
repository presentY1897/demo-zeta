
import { cn } from "@theta/ui";

/** 플롯 그라디언트 + 이모지 원형 아바타 — 커버 정보만 있으면 그린다 */
export function PlotAvatar({
  plot,
  size = 34,
  className,
}: {
  plot: { emoji: string; gradient: [string, string] };
  size?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `linear-gradient(135deg, ${plot.gradient[0]}, ${plot.gradient[1]})`,
      }}
    >
      {plot.emoji}
    </div>
  );
}
