"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { ProviderConfig } from "./types";

export type ProviderPreset =
  | "openai"
  | "openrouter"
  | "ollama"
  | "custom"
  | "anthropic";

export const PRESETS: Record<
  ProviderPreset,
  {
    label: string;
    kind: "openai" | "anthropic";
    baseUrl: string;
    needsKey: boolean;
    modelPlaceholder: string;
  }
> = {
  openai: {
    label: "OpenAI",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    needsKey: true,
    modelPlaceholder: "gpt-4o-mini",
  },
  openrouter: {
    label: "OpenRouter",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    needsKey: true,
    modelPlaceholder: "anthropic/claude-haiku-4.5",
  },
  ollama: {
    label: "Ollama (로컬)",
    kind: "openai",
    baseUrl: "http://localhost:11434/v1",
    needsKey: false,
    modelPlaceholder: "exaone3.5:7.8b",
  },
  custom: {
    label: "OpenAI 호환 (직접 입력)",
    kind: "openai",
    baseUrl: "",
    needsKey: false,
    modelPlaceholder: "모델 이름",
  },
  anthropic: {
    label: "Anthropic",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com",
    needsKey: true,
    modelPlaceholder: "claude-haiku-4-5",
  },
};

interface AiSettingsState {
  /** mock = 키 없이 동작하는 데모 모델, byok = 내 AI 연결 */
  mode: "mock" | "byok";
  preset: ProviderPreset;
  baseUrl: string;
  apiKey: string;
  model: string;
  setMode: (mode: "mock" | "byok") => void;
  applyPreset: (preset: ProviderPreset) => void;
  patch: (p: Partial<Pick<AiSettingsState, "baseUrl" | "apiKey" | "model">>) => void;
}

export const useAiSettings = create<AiSettingsState>()(
  persist(
    (set) => ({
      mode: "mock",
      preset: "openai",
      baseUrl: PRESETS.openai.baseUrl,
      apiKey: "",
      model: "",
      setMode: (mode) => set({ mode }),
      applyPreset: (preset) =>
        set({ preset, baseUrl: PRESETS[preset].baseUrl, model: "" }),
      patch: (p) => set(p),
    }),
    { name: "theta-ai-settings" },
  ),
);

/** 현재 설정을 /api/chat 요청용 ProviderConfig로 변환 */
export function toProviderConfig(
  s: Pick<AiSettingsState, "mode" | "preset" | "baseUrl" | "apiKey" | "model">,
): ProviderConfig {
  if (s.mode === "mock") return { kind: "mock" };
  return {
    kind: PRESETS[s.preset].kind,
    baseUrl: s.baseUrl,
    apiKey: s.apiKey || undefined,
    model: s.model,
  };
}

/** 요청 전에 잡을 수 있는 설정 누락 — 문제 없으면 null */
export function validateProviderConfig(cfg: ProviderConfig): string | null {
  if (cfg.kind === "mock") return null;
  if (cfg.kind === "anthropic" && !cfg.apiKey) {
    return "Anthropic API 키가 설정되지 않았어요.";
  }
  if (cfg.kind === "openai" && !cfg.baseUrl?.trim()) {
    return "엔드포인트 주소가 설정되지 않았어요.";
  }
  if (!cfg.model?.trim()) {
    return "모델 이름이 설정되지 않았어요.";
  }
  return null;
}

/** persist 복원 전 하이드레이션 불일치 방지 */
export function useAiSettingsHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const state = useAiSettings();
  return { hydrated, ...state };
}
