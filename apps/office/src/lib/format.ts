/** 12,345 → "1.2만", 4.2억 등 한국식 축약 표기 */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const fmt = (v: number, unit: string) => {
    const s = v >= 100 ? Math.round(v).toLocaleString("ko-KR") : v.toFixed(1);
    return `${sign}${s.replace(/\.0$/, "")}${unit}`;
  };
  if (abs >= 1e12) return fmt(abs / 1e12, "조");
  if (abs >= 1e8) return fmt(abs / 1e8, "억");
  if (abs >= 1e4) return fmt(abs / 1e4, "만");
  return `${sign}${abs.toLocaleString("ko-KR")}`;
}

export function formatKrw(n: number): string {
  return `₩${formatCompact(n)}`;
}

export function formatPct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

/** 증감률 (+12.3% / -4.5%) — 기준이 0이면 null */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

/** "2026-08-31" → "8/31" */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 축 눈금용 깔끔한 스텝 (1/2/2.5/5 × 10^k) */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const candidates = [1, 2, 2.5, 5, 10].map((c) => c * pow);
  const step =
    candidates.find((c) => c >= rough) ?? candidates[candidates.length - 1]!;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if ((ticks[ticks.length - 1] ?? 0) < max) {
    ticks.push((ticks[ticks.length - 1] ?? 0) + step);
  }
  return ticks;
}
