"use client";

import { useMemo, useState } from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import { LineChart } from "@/components/charts/LineChart";
import { SeriesTable } from "@/components/charts/SeriesTable";
import { StatTile } from "@/components/charts/StatTile";
import { RangeChips } from "@/components/RangeChips";
import {
  deltaPct,
  formatCompact,
  formatKrw,
  shortDate,
} from "@/lib/format";
import { downsample, sliceRange, sum, type RangeDays } from "@/lib/metrics-utils";
import type { MetricPoint } from "@/lib/metric-point";
import { ACCENT, SERIES } from "@/lib/palette";

/** 대시보드 — 시계열은 서버가 합산해 넘겨주고, 기간 전환만 클라이언트에서 다시 계산한다 */
export function DashboardView({ series }: { series: MetricPoint[] }) {
  const [range, setRange] = useState<RangeDays>(30);

  const view = useMemo(() => {
    const { current, previous } = sliceRange(series, range);
    const labels = current.map((m) => shortDate(m.date));
    const dau = current.map((m) => m.dau);
    const avg = (arr: number[]) => sum(arr) / Math.max(arr.length, 1);

    return {
      labels,
      dau,
      avgDau: avg(dau),
      dauDelta: previous ? deltaPct(avg(dau), avg(previous.map((m) => m.dau))) : null,
      newUsers: sum(current.map((m) => m.newUsers)),
      newUsersDelta: previous
        ? deltaPct(
            sum(current.map((m) => m.newUsers)),
            sum(previous.map((m) => m.newUsers)),
          )
        : null,
      newUsersTrend: downsample(current.map((m) => m.newUsers)),
      turns: sum(current.map((m) => m.turns)),
      turnsDelta: previous
        ? deltaPct(
            sum(current.map((m) => m.turns)),
            sum(previous.map((m) => m.turns)),
          )
        : null,
      turnsTrend: downsample(current.map((m) => m.turns)),
      revenue: sum(current.map((m) => m.revenueKrw)),
      revenueDelta: previous
        ? deltaPct(
            sum(current.map((m) => m.revenueKrw)),
            sum(previous.map((m) => m.revenueKrw)),
          )
        : null,
      revenueTrend: downsample(current.map((m) => m.revenueKrw)),
      moneySeries: [
        {
          key: "revenue",
          label: "구독 매출",
          color: SERIES[0],
          values: current.map((m) => m.revenueKrw),
        },
        {
          key: "gpu",
          label: "GPU 비용",
          color: SERIES[1],
          values: current.map((m) => m.gpuCostKrw),
        },
        {
          key: "fee",
          label: "결제 수수료",
          color: SERIES[2],
          values: current.map((m) => m.feeKrw),
        },
      ],
    };
  }, [series, range]);

  const latestDate = series[series.length - 1]?.date;
  const hasReal = series.some((m) => m.hasReal);
  const deltaLabel = `이전 ${range}일 대비`;
  const dauSeries = [
    { key: "dau", label: "DAU", color: ACCENT, values: view.dau },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">대시보드</h1>
          <p className="mt-1 text-sm text-text-sub">
            기준일 {latestDate}
            {hasReal && " · 시드 지표 + 실사용 합산"}
          </p>
        </div>
        <RangeChips value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="평균 DAU"
          value={formatCompact(Math.round(view.avgDau))}
          delta={view.dauDelta}
          deltaLabel={deltaLabel}
          trend={downsample(view.dau)}
        />
        <StatTile
          label="신규 가입"
          value={formatCompact(view.newUsers)}
          delta={view.newUsersDelta}
          deltaLabel={deltaLabel}
          trend={view.newUsersTrend}
        />
        <StatTile
          label="대화 턴"
          value={formatCompact(view.turns)}
          delta={view.turnsDelta}
          deltaLabel={deltaLabel}
          trend={view.turnsTrend}
        />
        <StatTile
          label="구독 매출"
          value={formatKrw(view.revenue)}
          delta={view.revenueDelta}
          deltaLabel={deltaLabel}
          trend={view.revenueTrend}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="DAU 추이"
          subtitle="일간 활성 유저"
          table={
            <SeriesTable
              labels={view.labels}
              series={dauSeries}
              format={formatCompact}
            />
          }
        >
          <LineChart
            labels={view.labels}
            series={dauSeries}
            yFormat={formatCompact}
          />
        </ChartCard>

        <ChartCard
          title="매출 · 비용"
          subtitle="일간, 원화 기준"
          table={
            <SeriesTable
              labels={view.labels}
              series={view.moneySeries}
              format={formatKrw}
            />
          }
        >
          <LineChart
            labels={view.labels}
            series={view.moneySeries}
            yFormat={formatKrw}
          />
        </ChartCard>
      </div>
    </div>
  );
}
