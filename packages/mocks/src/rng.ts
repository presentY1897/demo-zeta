/** 시드 고정 PRNG (mulberry32) — 모든 모킹 데이터가 실행마다 동일하게 재현된다 */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(arr: readonly T[]): T => {
      const v = arr[Math.floor(next() * arr.length)];
      if (v === undefined) throw new Error("empty array");
      return v;
    },
    /** [["KR", 0.5], ["JP", 0.35], ...] 형태의 가중 선택 */
    weighted: <T>(entries: readonly (readonly [T, number])[]): T => {
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [v, w] of entries) {
        r -= w;
        if (r <= 0) return v;
      }
      const last = entries[entries.length - 1];
      if (!last) throw new Error("empty entries");
      return last[0];
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** 데모 데이터의 기준일 — 실행 시점과 무관하게 고정 */
export const TODAY = new Date("2026-08-31T00:00:00+09:00");

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysAgo(n: number): Date {
  return new Date(TODAY.getTime() - n * DAY_MS);
}
