import { cn } from "@theta/ui";
import type { PlotView } from "@/lib/plot-view";

/** 외부 이미지 없이 그라디언트+이모지로 표현하는 플롯 커버 */
export function PlotCover({
  plot,
  className,
  emojiClassName,
}: {
  plot: PlotView;
  className?: string;
  emojiClassName?: string;
}) {
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
