import type { DailyMetric } from "@theta/mocks";

/**
 * 차트가 쓰는 하루치 지표. 시드(daily_metrics)의 모양을 그대로 유지하고
 * 실사용 추정치만 별도 필드로 얹는다 — 실사용 토큰은 자사 모델(koji/luca)에 귀속시킬 수 없어
 * 모델별 분해(`tokens`)에 섞으면 데이터가 거짓이 되기 때문이다.
 */
export interface MetricPoint extends DailyMetric {
  /** usage_events 기반 추정 토큰 합(입력+출력) */
  realTokens: number;
  /** 이 날짜에 실사용 데이터가 있었는가 — 화면의 "추정치 포함" 표시에 쓴다 */
  hasReal: boolean;
}

/** 실사용 집계 한 줄 */
export interface RealDailyPoint {
  date: string;
  dau: number;
  turns: number;
  newUsers: number;
  tokens: number;
}

const EMPTY_TOKENS: DailyMetric["tokens"] = {
  "koji-lite": { input: 0, output: 0 },
  koji: { input: 0, output: 0 },
  luca: { input: 0, output: 0 },
};

/**
 * 시드 시계열과 실사용 시계열을 날짜로 합친다.
 * 시드는 08-31에서 끝나고 실사용은 그 뒤부터 쌓이므로 사실상 이어붙이기지만,
 * 겹치는 날이 생기면 **더한다**(DAU·신규·턴은 합, 매출·비용 계열은 시드 값 유지).
 */
export function mergeMetricSeries(
  dates: string[],
  seed: ReadonlyMap<string, DailyMetric>,
  real: ReadonlyMap<string, RealDailyPoint>,
): MetricPoint[] {
  return dates.map((date) => {
    const s = seed.get(date);
    const r = real.get(date);
    return {
      date,
      dau: (s?.dau ?? 0) + (r?.dau ?? 0),
      newUsers: (s?.newUsers ?? 0) + (r?.newUsers ?? 0),
      turns: (s?.turns ?? 0) + (r?.turns ?? 0),
      // 모델별 토큰·매출·비용은 시드 전용 — 실데이터에 대응하는 원가 정보가 없다
      tokens: s?.tokens ?? EMPTY_TOKENS,
      gpuCostKrw: s?.gpuCostKrw ?? 0,
      revenueKrw: s?.revenueKrw ?? 0,
      feeKrw: s?.feeKrw ?? 0,
      realTokens: r?.tokens ?? 0,
      hasReal: r !== undefined,
    };
  });
}

/** `from`부터 `to`까지의 날짜 문자열(YYYY-MM-DD) 목록 */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor.getTime() <= end.getTime()) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/** 한국 시간 기준 오늘 날짜 — 지표의 기준일이 시드 TODAY가 아니라 실제 오늘이 된다 */
export function todayInSeoul(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
