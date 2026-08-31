"use client";

import { useState } from "react";
import { niceTicks } from "@/lib/format";
import { AXIS, GRID } from "@/lib/palette";
import { useElementWidth } from "./useElementWidth";

export interface BarSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

const PAD_L = 48;
const PAD_R = 14;
const PAD_T = 10;
const PAD_B = 24;
const GAP = 2; // 세그먼트 사이 서피스 갭
const MAX_BAR_W = 24;

/** 위쪽만 4px 라운드된 막대 경로 (데이터 끝만 둥글게, 베이스라인은 각지게) */
function topRoundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rr = Math.min(r, h / 2, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/**
 * 주간 스택 바 — 세그먼트 2px 서피스 갭, 상단 4px 라운드,
 * 막대 전체가 히트 타깃(호버 리프트 + 전체 세그먼트 툴팁), 키보드 탐색.
 */
export function StackedBarChart({
  labels,
  series,
  height = 220,
  yFormat,
}: {
  labels: string[];
  series: BarSeries[];
  height?: number;
  yFormat: (n: number) => string;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const n = labels.length;
  const plotW = Math.max(width - PAD_L - PAD_R, 10);
  const plotH = height - PAD_T - PAD_B;

  const totals = labels.map((_, i) =>
    series.reduce((acc, s) => acc + (s.values[i] ?? 0), 0),
  );
  const ticks = niceTicks(Math.max(1, ...totals));
  const yMax = ticks[ticks.length - 1] ?? 1;
  const y = (v: number) => PAD_T + plotH - (v / yMax) * plotH;

  const slotW = plotW / Math.max(n, 1);
  const barW = Math.min(MAX_BAR_W, slotW * 0.55);
  const barX = (i: number) => PAD_L + slotW * i + (slotW - barW) / 2;

  const tooltipLeft =
    hover === null
      ? 0
      : barX(hover) > width / 2
        ? barX(hover) - 168
        : barX(hover) + barW + 10;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span
            key={s.key}
            className="inline-flex items-center gap-1.5 text-[11px] text-text-sub"
          >
            <span
              aria-hidden
              className="inline-block size-2.5 rounded-[3px]"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div ref={ref} className="relative">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${series.map((s) => s.label).join(", ")} 주간 스택 차트`}
          tabIndex={0}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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

          {labels.map((label, i) => (
            <text
              key={label}
              x={barX(i) + barW / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-text-faint)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {label}
            </text>
          ))}

          {labels.map((_, i) => {
            let cum = 0;
            const segs = series.map((s, si) => {
              const v = s.values[i] ?? 0;
              const yTop = y(cum + v);
              const yBottom = y(cum);
              cum += v;
              return { s, si, v, yTop, yBottom };
            });
            const topIndex = segs.reduce(
              (acc, seg, idx) => (seg.v > 0 ? idx : acc),
              -1,
            );
            return (
              <g
                key={i}
                style={{
                  filter: hover === i ? "brightness(1.25)" : undefined,
                }}
              >
                {segs.map(({ s, si, v, yTop, yBottom }) => {
                  if (v <= 0) return null;
                  // 위 세그먼트와의 2px 서피스 갭 (최상단 제외)
                  const gapTop = si === topIndex ? 0 : GAP;
                  const h = Math.max(yBottom - yTop - gapTop, 1);
                  if (si === topIndex) {
                    return (
                      <path
                        key={s.key}
                        d={topRoundedRect(barX(i), yTop, barW, h, 4)}
                        fill={s.color}
                      />
                    );
                  }
                  return (
                    <rect
                      key={s.key}
                      x={barX(i)}
                      y={yTop + gapTop}
                      width={barW}
                      height={h}
                      fill={s.color}
                    />
                  );
                })}
                {/* 히트 타깃 — 마크보다 넓게, 슬롯 전체 */}
                <rect
                  x={PAD_L + slotW * i}
                  y={PAD_T}
                  width={slotW}
                  height={plotH}
                  fill="transparent"
                  onPointerEnter={() => setHover(i)}
                />
              </g>
            );
          })}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-40 rounded-lg border border-line bg-surface-2 p-2.5 shadow-lg"
            style={{ left: tooltipLeft }}
          >
            <p className="mb-1 text-[11px] text-text-faint">{labels[hover]}</p>
            {[...series].reverse().map((s) => (
              <p
                key={s.key}
                className="flex items-center gap-1.5 py-0.5 text-[12px]"
              >
                <span
                  aria-hidden
                  className="inline-block size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: s.color }}
                />
                <span className="font-semibold tabular-nums">
                  {yFormat(s.values[hover] ?? 0)}
                </span>
                <span className="truncate text-text-sub">{s.label}</span>
              </p>
            ))}
            <p className="mt-1 border-t border-line pt-1 text-[12px]">
              <span className="font-semibold tabular-nums">
                {yFormat(totals[hover] ?? 0)}
              </span>{" "}
              <span className="text-text-sub">합계</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
