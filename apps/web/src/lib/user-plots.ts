"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Plot } from "@theta/mocks";

/** 유저가 만들기에서 생성한 플롯 — 이 브라우저에만 저장된다 */
interface UserPlotsState {
  plots: Plot[];
  addPlot: (plot: Plot) => void;
  removePlot: (id: string) => void;
}

export const useUserPlotsStore = create<UserPlotsState>()(
  persist(
    (set) => ({
      plots: [],
      addPlot: (plot) => set((s) => ({ plots: [plot, ...s.plots] })),
      removePlot: (id) =>
        set((s) => ({ plots: s.plots.filter((p) => p.id !== id) })),
    }),
    { name: "theta-my-plots" },
  ),
);

/** 새 유저 플롯의 id — 정적 플롯과 충돌하지 않도록 u- 접두사 */
export function newUserPlotId(): string {
  return `u-${crypto.randomUUID().slice(0, 8)}`;
}
