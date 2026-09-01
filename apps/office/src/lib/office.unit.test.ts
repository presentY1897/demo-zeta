import { describe, expect, it } from "vitest";
import type { DailyMetric } from "@theta/mocks";
import {
  dateRange,
  mergeMetricSeries,
  todayInSeoul,
  type RealDailyPoint,
} from "./metric-point";
import { deltaPct, formatCompact, formatKrw, formatPct, niceTicks, shortDate } from "./format";
import { sliceRange, weeklyBuckets } from "./metrics-utils";

const ZERO_TOKENS: DailyMetric["tokens"] = {
  "koji-lite": { input: 0, output: 0 },
  koji: { input: 0, output: 0 },
  luca: { input: 0, output: 0 },
};

function seedPoint(date: string, overrides: Partial<DailyMetric> = {}): DailyMetric {
  return {
    date,
    dau: 100,
    newUsers: 10,
    turns: 1000,
    tokens: ZERO_TOKENS,
    gpuCostKrw: 5000,
    revenueKrw: 30000,
    feeKrw: 6000,
    ...overrides,
  };
}

function realPoint(date: string, overrides: Partial<RealDailyPoint> = {}): RealDailyPoint {
  return { date, dau: 2, turns: 7, newUsers: 1, tokens: 900, ...overrides };
}

const seedMap = (...points: DailyMetric[]) => new Map(points.map((p) => [p.date, p]));
const realMap = (...points: RealDailyPoint[]) => new Map(points.map((p) => [p.date, p]));

describe("시드 + 실사용 합산", () => {
  it("겹치지 않는 날짜는 이어붙인다 — 시드는 08-31에 끝나고 실사용은 09-01부터", () => {
    const series = mergeMetricSeries(
      ["2026-08-31", "2026-09-01"],
      seedMap(seedPoint("2026-08-31")),
      realMap(realPoint("2026-09-01")),
    );

    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ dau: 100, turns: 1000, newUsers: 10, hasReal: false });
    expect(series[1]).toMatchObject({ dau: 2, turns: 7, newUsers: 1, hasReal: true });
    // 실사용 날짜에는 매출·비용이 없다(시드 전용 계열)
    expect(series[1]!.revenueKrw).toBe(0);
    expect(series[1]!.realTokens).toBe(900);
  });

  it("겹치는 날은 더한다", () => {
    const [point] = mergeMetricSeries(
      ["2026-08-31"],
      seedMap(seedPoint("2026-08-31")),
      realMap(realPoint("2026-08-31")),
    );
    expect(point).toMatchObject({ dau: 102, turns: 1007, newUsers: 11, hasReal: true });
    // 매출·GPU 비용은 시드 값 그대로 — 실데이터에 대응하는 원가 정보가 없다
    expect(point!.revenueKrw).toBe(30000);
    expect(point!.gpuCostKrw).toBe(5000);
  });

  it("실사용이 전혀 없는 구간은 순수 시드다", () => {
    const series = mergeMetricSeries(
      ["2026-08-30", "2026-08-31"],
      seedMap(seedPoint("2026-08-30"), seedPoint("2026-08-31")),
      realMap(),
    );
    expect(series.every((p) => !p.hasReal && p.realTokens === 0)).toBe(true);
    expect(series.map((p) => p.dau)).toEqual([100, 100]);
  });

  it("시드가 없는 미래 날짜는 순수 실사용이고 모델별 토큰은 비어 있다", () => {
    const [point] = mergeMetricSeries(["2026-09-05"], seedMap(), realMap(realPoint("2026-09-05")));
    expect(point).toMatchObject({ dau: 2, turns: 7, gpuCostKrw: 0, revenueKrw: 0 });
    expect(point!.tokens["koji-lite"]).toEqual({ input: 0, output: 0 });
  });

  it("날짜 목록에 없는 데이터는 무시되고, 데이터 없는 날짜는 0으로 채워진다", () => {
    const series = mergeMetricSeries(
      ["2026-09-02"],
      seedMap(seedPoint("2026-08-31")),
      realMap(realPoint("2026-09-01")),
    );
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({ date: "2026-09-02", dau: 0, turns: 0, hasReal: false });
  });
});

describe("날짜 유틸", () => {
  it("범위는 양 끝을 포함하고 월을 넘어간다", () => {
    expect(dateRange("2026-08-30", "2026-09-02")).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
    ]);
    expect(dateRange("2026-09-01", "2026-09-01")).toEqual(["2026-09-01"]);
    expect(dateRange("2026-09-02", "2026-09-01")).toEqual([]);
  });

  it("기준일은 한국 시간 기준이다 — UTC 자정 직후는 이미 한국의 다음 날", () => {
    expect(todayInSeoul(new Date("2026-09-01T00:30:00Z"))).toBe("2026-09-01");
    expect(todayInSeoul(new Date("2026-09-01T15:30:00Z"))).toBe("2026-09-02");
  });
});

describe("구간 자르기", () => {
  const series = mergeMetricSeries(
    dateRange("2026-06-04", "2026-09-01"),
    seedMap(...dateRange("2026-06-04", "2026-08-31").map((d) => seedPoint(d))),
    realMap(realPoint("2026-09-01")),
  );

  it("7일·30일은 직전 동일 구간이 함께 잡힌다", () => {
    for (const days of [7, 30] as const) {
      const { current, previous } = sliceRange(series, days);
      expect(current, String(days)).toHaveLength(days);
      expect(previous, String(days)).toHaveLength(days);
      expect(current[current.length - 1]!.date).toBe("2026-09-01");
    }
  });

  it("90일은 비교 구간이 없어 previous가 null이다", () => {
    const { current, previous } = sliceRange(series, 90);
    expect(current).toHaveLength(90);
    expect(previous).toBeNull();
  });
});

describe("주간 묶음", () => {
  it("뒤에서부터 7일씩 묶고 앞쪽 자투리는 버린다", () => {
    const days = dateRange("2026-08-01", "2026-08-31").map((d) => seedPoint(d)); // 31일
    const buckets = weeklyBuckets(days);
    expect(buckets).toHaveLength(4);
    expect(buckets.every((b) => b.length === 7)).toBe(true);
    // 마지막 묶음의 끝은 항상 마지막 날
    expect(buckets[3]![6]!.date).toBe("2026-08-31");
    // 앞의 3일(08-01~08-03)은 버려진다
    expect(buckets[0]![0]!.date).toBe("2026-08-04");
  });

  it("7일 미만이면 묶음이 없다", () => {
    expect(weeklyBuckets(dateRange("2026-08-01", "2026-08-06").map((d) => seedPoint(d)))).toEqual([]);
  });
});

describe("표기 포맷", () => {
  it("만·억·조 축약", () => {
    expect(formatCompact(9_999)).toBe("9,999");
    expect(formatCompact(12_345)).toBe("1.2만");
    expect(formatCompact(420_000_000)).toBe("4.2억");
    expect(formatCompact(-12_345)).toBe("-1.2만");
    expect(formatCompact(0)).toBe("0");
  });

  it("원화와 퍼센트", () => {
    expect(formatKrw(12_345)).toBe("₩1.2만");
    expect(formatPct(0.1234)).toBe("12.3%");
    expect(formatPct(0.1234, 0)).toBe("12%");
  });

  it("증감률은 기준이 0이면 null", () => {
    expect(deltaPct(120, 100)).toBeCloseTo(0.2);
    expect(deltaPct(80, 100)).toBeCloseTo(-0.2);
    expect(deltaPct(50, 0)).toBeNull();
  });

  it("날짜는 월/일로 줄인다", () => {
    expect(shortDate("2026-08-31")).toBe("8/31");
    expect(shortDate("2026-09-01")).toBe("9/1");
  });
});

describe("축 눈금", () => {
  it("0에서 시작해 1/2/2.5/5 스텝으로 올라간다", () => {
    expect(niceTicks(100)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(9)).toEqual([0, 2.5, 5, 7.5, 10]);
    expect(niceTicks(0)).toEqual([0, 1]);
  });

  it("마지막 눈금은 항상 최댓값 이상이다", () => {
    for (const max of [3, 17, 123, 4567, 98_765]) {
      const ticks = niceTicks(max);
      expect(ticks[0]).toBe(0);
      expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max);
    }
  });
});
