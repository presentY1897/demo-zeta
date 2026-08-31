import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** 태그 필터 등에 쓰는 선택형 칩. onClick이 없으면 정적 라벨로 렌더링된다. */
export function Chip({ active, className, onClick, ...props }: ChipProps) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[12px] font-medium transition-colors",
        active
          ? "bg-primary text-white"
          : "bg-surface-2 text-text-sub",
        onClick && !active && "hover:bg-line hover:text-text",
        className,
      )}
      {...props}
    />
  );
}
