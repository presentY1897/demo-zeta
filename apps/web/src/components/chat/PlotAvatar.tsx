import { cn } from "@theta/ui";

/** 아바타가 그릴 수 있는 최소 정보 — 플롯 전체가 아니어도 된다(대화 목록의 방 요약 등) */
export interface AvatarPlot {
  name: string;
  emoji: string;
  gradient: [string, string];
  coverUrl: string | null;
}

/**
 * 원형 아바타 — 커버 이미지가 있으면 썸네일, 없으면 그라디언트 + 이모지.
 * 채팅 말풍선·대화 목록·내 플롯 목록이 전부 이 컴포넌트를 쓴다.
 */
export function PlotAvatar({
  plot,
  size = 34,
  className,
}: {
  plot: AvatarPlot;
  size?: number;
  className?: string;
}) {
  if (plot.coverUrl) {
    return (
      <img
        src={plot.coverUrl}
        alt={plot.name}
        width={size}
        height={size}
        loading="lazy"
        className={cn("shrink-0 rounded-full bg-surface-2 object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

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
