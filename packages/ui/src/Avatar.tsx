import { cn } from "./cn";

export interface AvatarProps {
  /** 이니셜/이모지 한 글자 */
  label: string;
  /** 0-360 색상 훅 — 유저/캐릭터별 고정 색 */
  hue?: number;
  size?: number;
  className?: string;
}

/** 외부 이미지 없이 그라디언트 + 글자로 표현하는 아바타 */
export function Avatar({ label, hue = 255, size = 40, className }: AvatarProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white/90",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${hue} 60% 55%), hsl(${(hue + 40) % 360} 65% 40%))`,
      }}
    >
      {label}
    </div>
  );
}
