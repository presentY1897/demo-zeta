"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, Card, Spinner, cn } from "@theta/ui";
import {
  PRESETS,
  toProviderConfig,
  useAiSettingsHydrated,
  type ProviderPreset,
} from "@/lib/ai/settings";
import { streamChat } from "@/lib/ai/client";

type TestState =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "ok"; sample: string }
  | { phase: "fail"; message: string };

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm outline-none transition-colors placeholder:text-text-faint focus:border-primary/60";

export default function AiSettingsPage() {
  const s = useAiSettingsHydrated();
  const [test, setTest] = useState<TestState>({ phase: "idle" });
  const testAbortRef = useRef<AbortController | null>(null);

  async function runTest() {
    testAbortRef.current?.abort();
    const controller = new AbortController();
    testAbortRef.current = controller;
    setTest({ phase: "running" });
    let sample = "";
    try {
      const req = {
        provider: toProviderConfig(s),
        system: "당신은 연결 테스트 응답기입니다. 한 문장으로 짧게 인사하세요.",
        plotName: "세타",
        messages: [{ role: "user" as const, content: "안녕하세요!" }],
      };
      for await (const chunk of streamChat(req, controller.signal)) {
        sample += chunk;
        if (sample.length > 40) break;
      }
      controller.abort();
      setTest({ phase: "ok", sample: sample.trim().slice(0, 60) });
    } catch (e) {
      if (controller.signal.aborted && sample) {
        setTest({ phase: "ok", sample: sample.trim().slice(0, 60) });
      } else {
        setTest({
          phase: "fail",
          message: e instanceof Error ? e.message : "연결에 실패했어요.",
        });
      }
    }
  }

  if (!s.hydrated) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const preset = PRESETS[s.preset];

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <Link
          href="/my"
          className="text-sm text-text-faint underline underline-offset-4 hover:text-text-sub"
        >
          ← MY
        </Link>
        <h1 className="mt-2 text-lg font-extrabold">내 AI 연결</h1>
        <p className="mt-1 text-sm text-text-sub">
          대화에 사용할 AI를 선택하세요. 설정은 자동으로 저장돼요.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {(
          [
            {
              mode: "mock",
              title: "데모 모델",
              desc: "키 없이 바로 사용. 데모용 모의 응답이에요.",
            },
            {
              mode: "byok",
              title: "내 AI 연결",
              desc: "내 API 키로 실제 모델과 대화해요.",
            },
          ] as const
        ).map((opt) => (
          <button
            key={opt.mode}
            type="button"
            onClick={() => s.setMode(opt.mode)}
            className={cn(
              "rounded-card border p-4 text-left transition-colors",
              s.mode === opt.mode
                ? "border-primary bg-primary-soft"
                : "border-line bg-surface hover:border-text-faint",
            )}
          >
            <p className="text-sm font-bold">{opt.title}</p>
            <p className="mt-1 text-[12px] leading-snug text-text-sub">
              {opt.desc}
            </p>
          </button>
        ))}
      </div>

      {s.mode === "byok" && (
        <Card className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label htmlFor="preset" className="text-[13px] font-semibold text-text-sub">
              프로바이더
            </label>
            <select
              id="preset"
              value={s.preset}
              onChange={(e) => {
                s.applyPreset(e.target.value as ProviderPreset);
                setTest({ phase: "idle" });
              }}
              className={cn(inputClass, "appearance-none")}
            >
              {Object.entries(PRESETS).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="baseUrl" className="text-[13px] font-semibold text-text-sub">
              엔드포인트
            </label>
            <input
              id="baseUrl"
              type="url"
              value={s.baseUrl}
              onChange={(e) => s.patch({ baseUrl: e.target.value })}
              placeholder="https://api.example.com/v1"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="apiKey" className="text-[13px] font-semibold text-text-sub">
              API 키{!preset.needsKey && " (선택)"}
            </label>
            <input
              id="apiKey"
              type="password"
              value={s.apiKey}
              onChange={(e) => s.patch({ apiKey: e.target.value })}
              placeholder={preset.needsKey ? "sk-..." : "필요 없는 경우 비워두세요"}
              autoComplete="off"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="model" className="text-[13px] font-semibold text-text-sub">
              모델
            </label>
            <input
              id="model"
              type="text"
              value={s.model}
              onChange={(e) => s.patch({ model: e.target.value })}
              placeholder={preset.modelPlaceholder}
              className={inputClass}
            />
          </div>
        </Card>
      )}

      <div className="space-y-3">
        <Button
          full
          size="lg"
          onClick={() => void runTest()}
          disabled={test.phase === "running"}
        >
          {test.phase === "running" ? "연결 확인 중…" : "연결 테스트"}
        </Button>

        {test.phase === "ok" && (
          <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-[13px] text-success">
            연결 성공! 응답 예시: “{test.sample}…”
          </div>
        )}
        {test.phase === "fail" && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">
            {test.message}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-surface px-4 py-3 text-[12px] leading-relaxed text-text-faint">
        🔒 API 키는 이 브라우저(localStorage)에만 저장돼요. 서버에 저장되지
        않으며, 대화 요청을 중계할 때만 세타 서버를 통해 프로바이더로
        전달됩니다.
      </div>
    </div>
  );
}
