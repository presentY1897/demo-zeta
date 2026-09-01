"use client";

import { useMemo, useState } from "react";
import { models } from "@theta/mocks";
import { Card } from "@theta/ui";
import { ChartCard } from "@/components/charts/ChartCard";
import { LineChart } from "@/components/charts/LineChart";
import { SeriesTable } from "@/components/charts/SeriesTable";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { StatTile } from "@/components/charts/StatTile";
import { RangeChips } from "@/components/RangeChips";
import {
  deltaPct,
  formatCompact,
  formatKrw,
  formatPct,
  shortDate,
} from "@/lib/format";
import {
  downsample,
  modelCostKrw,
  sliceRange,
  sum,
  totalTokens,
  weeklyBuckets,
  type RangeDays,
} from "@/lib/metrics-utils";
import { DEEMPH, MODEL_COLORS } from "@/lib/palette";
import type { MetricPoint } from "@/lib/metric-point";

/** 비용·모델 — 매출·GPU 비용·모델별 분해는 시드 전용이고, 처리 토큰만 실사용을 합산한다 */
export function CostView({ series }: { series: MetricPoint[] }) {
  const [range, setRange] = useState<RangeDays>(30);

  const view = useMemo(() => {
    const { current, previous } = sliceRange(series, range);
    const labels = current.map((m) => shortDate(m.date));

    const gpu = sum(current.map((m) => m.gpuCostKrw));
    const gpuPrev = previous ? sum(previous.map((m) => m.gpuCostKrw)) : null;
    const seedTokens = sum(current.map(totalTokens));
    const realTokens = sum(current.map((m) => m.realTokens));
    const tokens = seedTokens + realTokens;
    const revenue = sum(current.map((m) => m.revenueKrw));
    const fee = sum(current.map((m) => m.feeKrw));
    const dauSum = sum(current.map((m) => m.dau));

    // 주간 모델별 토큰 스택
    const buckets = weeklyBuckets(current);
    const weekLabels = buckets.map((b) => `${shortDate(b[0]!.date)}~`);
    const weeklyTokenSeries = [
      ...models.map((model) => ({
        key: model.id,
        label: model.label,
        color: MODEL_COLORS[model.id],
        values: buckets.map((b) =>
          sum(b.map((m) => m.tokens[model.id].input + m.tokens[model.id].output)),
        ),
      })),
      // 실사용은 유저의 BYOK 모델이라 자사 모델에 귀속시킬 수 없다 — 별도 세그먼트로 둔다
      {
        key: "real",
        label: "실사용(추정)",
        color: DEEMPH,
        values: buckets.map((b) => sum(b.map((m) => m.realTokens))),
      },
    ];

    // 일간 모델별 GPU 비용
    const dailyCostSeries = models.map((model) => ({
      key: model.id,
      label: model.label,
      color: MODEL_COLORS[model.id],
      values: current.map((m) => Math.round(modelCostKrw(m, model.id))),
    }));

    // 구간 내 모델별 토큰 비중 — 분모는 자사 모델 토큰만(실사용 BYOK는 자사 모델이 아니다)
    const shareByModel = models.map((model) => {
      const t = sum(
        current.map((m) => m.tokens[model.id].input + m.tokens[model.id].output),
      );
      return { model, tokens: t, share: seedTokens > 0 ? t / seedTokens : 0 };
    });

    return {
      labels,
      gpu,
      gpuDelta: gpuPrev !== null ? deltaPct(gpu, gpuPrev) : null,
      gpuTrend: downsample(current.map((m) => m.gpuCostKrw)),
      tokens,
      realTokens,
      margin: revenue > 0 ? (revenue - fee - gpu) / revenue : 0,
      costPerDau: dauSum > 0 ? gpu / dauSum : 0,
      weekLabels,
      weeklyTokenSeries,
      dailyCostSeries,
      shareByModel,
    };
  }, [series, range]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">비용·모델</h1>
          <p className="mt-1 text-sm text-text-sub">
            자체 서빙 모델의 토큰·GPU 비용과 수익성
          </p>
        </div>
        <RangeChips value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="GPU 서빙 비용"
          value={formatKrw(view.gpu)}
          delta={view.gpuDelta}
          deltaLabel={`이전 ${range}일 대비`}
          upIsGood={false}
          trend={view.gpuTrend}
        />
        <StatTile
          label="처리 토큰"
          value={`${formatCompact(view.tokens)} 토큰`}
          note={view.realTokens > 0 ? "실사용 추정치 포함" : undefined}
        />
        <StatTile label="유저·일당 서빙 비용" value={formatKrw(view.costPerDau)} />
        <StatTile label="공헌 마진율" value={formatPct(view.margin)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="주간 모델별 토큰"
          subtitle="입력+출력 합계, 7일 묶음 · 실사용은 추정치"
          table={
            <SeriesTable
              labels={view.weekLabels}
              series={view.weeklyTokenSeries}
              format={formatCompact}
            />
          }
        >
          <StackedBarChart
            labels={view.weekLabels}
            series={view.weeklyTokenSeries}
            yFormat={formatCompact}
          />
        </ChartCard>

        <ChartCard
          title="모델별 GPU 비용"
          subtitle="일간, 원화 기준 · 시드 데이터"
          table={
            <SeriesTable
              labels={view.labels}
              series={view.dailyCostSeries}
              format={formatKrw}
            />
          }
        >
          <LineChart
            labels={view.labels}
            series={view.dailyCostSeries}
            yFormat={formatKrw}
          />
        </ChartCard>
      </div>

      <Card className="overflow-x-auto p-4">
        <h2 className="text-sm font-bold">모델 원가표</h2>
        <p className="mb-3 mt-0.5 text-[12px] text-text-faint">
          원가·비중은 시드 데이터 기준이에요. 유저가 연결한 외부 모델(BYOK)은 자사 원가에
          대응하지 않아 여기 섞지 않습니다.
        </p>
        <table className="w-full min-w-[560px] text-[13px]">
          <thead className="text-left text-[12px] text-text-sub">
            <tr className="border-b border-line">
              <th className="pb-2 pr-4 font-semibold">모델</th>
              <th className="pb-2 pr-4 font-semibold">설명</th>
              <th className="pb-2 pr-4 text-right font-semibold">
                입력 ₩/1M
              </th>
              <th className="pb-2 pr-4 text-right font-semibold">
                출력 ₩/1M
              </th>
              <th className="pb-2 text-right font-semibold">토큰 비중</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line tabular-nums">
            {view.shareByModel.map(({ model, share }) => (
              <tr key={model.id}>
                <td className="py-2.5 pr-4 font-semibold">
                  <span
                    aria-hidden
                    className="mr-2 inline-block size-2.5 rounded-[3px] align-middle"
                    style={{ background: MODEL_COLORS[model.id] }}
                  />
                  {model.label}
                </td>
                <td className="py-2.5 pr-4 text-text-sub">
                  {model.description}
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {model.costPer1MInputKrw.toLocaleString("ko-KR")}
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {model.costPer1MOutputKrw.toLocaleString("ko-KR")}
                </td>
                <td className="py-2.5 text-right">{formatPct(share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
