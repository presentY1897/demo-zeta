"use client";

import { useEffect, useState } from "react";
import { getPlot, plots as staticPlots, type Plot } from "@theta/mocks";
import { useUserPlotsStore } from "./user-plots";

/** 정적 플롯 + 내가 만든 플롯을 합친 목록 (내 플롯이 앞) */
export function useAllPlots(): { hydrated: boolean; all: Plot[]; mine: Plot[] } {
  const mine = useUserPlotsStore((s) => s.plots);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return {
    hydrated,
    mine: hydrated ? mine : [],
    all: hydrated ? [...mine, ...staticPlots] : staticPlots,
  };
}

export type PlotLookup =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; plot: Plot; mine: boolean };

/** id로 플롯 해석 — 정적 플롯은 즉시, 유저 플롯은 persist 복원 후 확정 */
export function usePlot(id: string): PlotLookup {
  const userPlots = useUserPlotsStore((s) => s.plots);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const staticPlot = getPlot(id);
  if (staticPlot) return { status: "ready", plot: staticPlot, mine: false };
  if (!hydrated) return { status: "loading" };
  const mine = userPlots.find((p) => p.id === id);
  return mine ? { status: "ready", plot: mine, mine: true } : { status: "missing" };
}
