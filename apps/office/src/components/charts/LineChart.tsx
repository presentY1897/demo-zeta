"use client";

import { useState } from "react";
import { niceTicks } from "@/lib/format";
import { AXIS, GRID, SURFACE } from "@/lib/palette";
import { useElementWidth } from "./useElementWidth";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

const PAD_L = 48;
const PAD_R = 14;
const PAD_T = 10;
const PAD_B = 24; // x축 라벨 밴드 포함 — 컨테이너가 축을 잘라내지 않도록

/**
 * 멀티 시리즈 라인 차트 — 2px 라운드 선, 헤어라인 그리드,
 * 크로스헤어 스냅 툴팁(모든 시리즈 값), 키보드 화살표 탐색.
 * 단일 시리즈는 10% 워시 영역 + 끝값 직접 라벨.
 */
export function LineChart({
  labels,
  series,
  height = 220,
  yFormat,
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  yFormat: (n: number) => string;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const n = labels.length;
  const plotW = Math.max(width - PAD_L - PAD_R, 10);
  const plotH = height - PAD_T - PAD_B;
  const maxV = Math.max(1, ...series.flatMap((s) => s.values));
  const ticks = niceTicks(maxV);
  const yMax = ticks[ticks.length - 1] ?? maxV;

  const x = (i: number) =>
    PAD_L + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD_T + plotH - (v / yMax) * plotH;

  const single = series.length === 1;
  const linePath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join("");

  // x축 라벨: 최대 6개, 마지막 라벨 포함
  const step = Math.max(1, Math.ceil(n / 6));
  const xLabelIdx = new Set<number>();
  for (let i = 0; i < n; i += step) xLabelIdx.add(i);
  xLabelIdx.add(n - 1);
  if (n - 1 - step / 2 > 0) {
    for (const i of xLabelIdx) {
      if (i !== n - 1 && n - 1 - i < step / 2) xLabelIdx.delete(i);
    }
  }

  function indexFromEvent(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD_L;
    const i = Math.round((px / plotW) * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  }

  const tooltipLeft =
    hover === null ? 0 : x(hover) > width / 2 ? x(hover) - 168 : x(hover) + 14;

  return (
    <div>
      {series.length >= 2 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
          {series.map((s) => (
            <span
              key={s.key}
              className="inline-flex items-center gap-1.5 text-[11px] text-text-sub"
            >
              <span
                aria-hidden
                className="inline-block h-[3px] w-3.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}

      <div ref={ref} className="relative">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${series.map((s) => s.label).join(", ")} 추이 차트`}
          tabIndex={0}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          onPointerMove={(e) => setHover(indexFromEvent(e))}
          onPointerLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
            } else if (e.key === "ArrowLeft") {
              setHover((h) => Math.max(0, (h ?? n) - 1));
            } else if (e.key === "Escape") {
              setHover(null);
            }
          }}
        >
          {/* 그리드 — 솔리드 헤어라인 */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD_L}
                x2={PAD_L + plotW}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? AXIS : GRID}
                strokeWidth="1"
              />
              <text
                x={PAD_L - 8}
                y={y(t) + 3}
                textAnchor="end"
                fontSize="10"
                fill="var(--color-text-faint)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {yFormat(t)}
              </text>
            </g>
          ))}

          {/* x축 라벨 */}
          {labels.map((label, i) =>
            xLabelIdx.has(i) ? (
              <text
                key={label}
                x={x(i)}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fill="var(--color-text-faint)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {label}
              </text>
            ) : null,
          )}

          {/* 영역 워시 (단일 시리즈) */}
          {single && series[0] && (
            <path
              d={`${linePath(series[0].values)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`}
              fill={series[0].color}
              opacity="0.1"
            />
          )}

          {/* 데이터 라인 */}
          {series.map((s) => (
            <path
              key={s.key}
              d={linePath(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* 끝값 직접 라벨 (단일 시리즈만 — 선택적 라벨링) */}
          {single && series[0] && n > 0 && (
            <text
              x={x(n - 1)}
              y={y(series[0].values[n - 1] ?? 0) - 10}
              textAnchor="end"
              fontSize="11"
              fontWeight="600"
              fill="var(--color-text-sub)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {yFormat(series[0].values[n - 1] ?? 0)}
            </text>
          )}

          {/* 크로스헤어 + 마커 (서피스 링) */}
          {hover !== null && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD_T}
                y2={PAD_T + plotH}
                stroke={AXIS}
                strokeWidth="1"
              />
              {series.map((s) => (
                <circle
                  key={s.key}
                  cx={x(hover)}
                  cy={y(s.values[hover] ?? 0)}
                  r="4.5"
                  fill={s.color}
                  stroke={SURFACE}
                  strokeWidth="2"
                />
              ))}
            </g>
          )}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-40 rounded-lg border border-line bg-surface-2 p-2.5 shadow-lg"
            style={{ left: tooltipLeft }}
          >
            <p className="mb-1 text-[11px] text-text-faint">{labels[hover]}</p>
            {series.map((s) => (
              <p
                key={s.key}
                className="flex items-center gap-1.5 py-0.5 text-[12px]"
              >
                <span
                  aria-hidden
                  className="inline-block h-[3px] w-3 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="font-semibold tabular-nums">
                  {yFormat(s.values[hover] ?? 0)}
                </span>
                <span className="truncate text-text-sub">{s.label}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
