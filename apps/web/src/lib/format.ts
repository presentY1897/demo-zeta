/** 12.3만 / 4,821 형태의 수 표기 */
export function formatCount(n: number): string {
  if (n >= 10_000) {
    const v = n / 10_000;
    return `${v >= 100 ? Math.round(v) : v.toFixed(1)}만`;
  }
  return n.toLocaleString("ko-KR");
}
