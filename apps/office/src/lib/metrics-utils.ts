import { dailyMetrics, models, type DailyMetric, type ModelId } from "@theta/mocks";

export type RangeDays = 7 | 30 | 90;

export const RANGE_OPTIONS: { value: RangeDays; label: string }[] = [
  { value: 7, label: "7일" },
  { value: 30, label: "30일" },
  { value: 90, label: "90일" },
];

/** 선택 구간과 (있다면) 직전 동일 길이 구간 */
export function sliceRange(days: RangeDays): {
  current: DailyMetric[];
  previous: DailyMetric[] | null;
} {
  const current = dailyMetrics.slice(-days);
  const prevStart = dailyMetrics.length - days * 2;
  const previous =
    prevStart >= 0 ? dailyMetrics.slice(prevStart, prevStart + days) : null;
  return { current, previous };
}

export const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);

/** 스파크라인용 다운샘플 — 마지막 값은 반드시 포함 */
export function downsample(arr: number[], points = 12): number[] {
  if (arr.length <= points) return arr;
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const idx = Math.round((i / (points - 1)) * (arr.length - 1));
    out.push(arr[idx] ?? 0);
  }
  return out;
}

export function totalTokens(m: DailyMetric): number {
  return models.reduce(
    (acc, model) => acc + m.tokens[model.id].input + m.tokens[model.id].output,
    0,
  );
}

/** 하루치 모델별 GPU 비용(원) */
export function modelCostKrw(m: DailyMetric, id: ModelId): number {
  const info = models.find((x) => x.id === id)!;
  const t = m.tokens[id];
  return (
    (t.input / 1_000_000) * info.costPer1MInputKrw +
    (t.output / 1_000_000) * info.costPer1MOutputKrw
  );
}

/** 뒤에서부터 7일 단위 묶음 (앞쪽 자투리는 버림) — 주간 스택 바용 */
export function weeklyBuckets(metrics: DailyMetric[]): DailyMetric[][] {
  const buckets: DailyMetric[][] = [];
  for (let end = metrics.length; end - 7 >= 0; end -= 7) {
    buckets.unshift(metrics.slice(end - 7, end));
  }
  return buckets;
}
