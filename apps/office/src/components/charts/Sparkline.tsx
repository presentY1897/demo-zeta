import { ACCENT, DEEMPH, SURFACE } from "@/lib/palette";

/** 스탯 타일용 미니 추세선 — 비강조 선 + 마지막 점만 강조 */
export function Sparkline({ values }: { values: number[] }) {
  const W = 96;
  const H = 28;
  const PAD = 4;
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = values[values.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      aria-hidden
      className="shrink-0"
    >
      <polyline
        points={points}
        fill="none"
        stroke={DEEMPH}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(last)}
        r="3"
        fill={ACCENT}
        stroke={SURFACE}
        strokeWidth="2"
      />
    </svg>
  );
}
