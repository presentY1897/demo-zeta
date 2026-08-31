import { Card } from "@theta/ui";
import { Sparkline } from "./Sparkline";

/**
 * KPI 스탯 타일 — 라벨 / 값 / 증감(방향 아이콘+텍스트, 색만으로 전달하지 않음) / 스파크라인.
 * 값은 비례 숫자꼴 그대로 둔다 (tabular-nums는 표 전용).
 */
export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  upIsGood = true,
  trend,
}: {
  label: string;
  value: string;
  /** 증감률 (0.123 = +12.3%) — null이면 비표시 */
  delta?: number | null;
  deltaLabel?: string;
  upIsGood?: boolean;
  trend?: number[];
}) {
  const showDelta = delta !== null && delta !== undefined;
  const up = showDelta && delta >= 0;
  const good = showDelta && (up ? upIsGood : !upIsGood);

  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-[12px] text-text-sub">{label}</p>
        <p className="mt-1 text-[22px] font-semibold leading-tight">{value}</p>
        {showDelta && (
          <p
            className={
              good
                ? "mt-0.5 text-[11px] text-success"
                : "mt-0.5 text-[11px] text-danger"
            }
          >
            {up ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(1)}%
            {deltaLabel && (
              <span className="text-text-faint"> · {deltaLabel}</span>
            )}
          </p>
        )}
      </div>
      {trend && trend.length >= 2 && <Sparkline values={trend} />}
    </Card>
  );
}
