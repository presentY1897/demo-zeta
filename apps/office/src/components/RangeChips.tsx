"use client";

import { Chip } from "@theta/ui";
import { RANGE_OPTIONS, type RangeDays } from "@/lib/metrics-utils";

/** 기간 필터 — 차트들 위 한 줄, 아래의 모든 지표·차트를 같은 구간으로 스코프 */
export function RangeChips({
  value,
  onChange,
}: {
  value: RangeDays;
  onChange: (v: RangeDays) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {RANGE_OPTIONS.map((opt) => (
        <Chip
          key={opt.value}
          active={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          최근 {opt.label}
        </Chip>
      ))}
    </div>
  );
}
