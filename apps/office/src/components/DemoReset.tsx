"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@theta/ui";

type Counts = Record<string, number>;

/**
 * 데모 초기화 카드. 배포본은 오피스 비밀번호가 공개돼 있어 누구든 데이터를 바꿀 수 있고,
 * 여기서 시드 직후 상태로 언제든 되돌릴 수 있다.
 */
export function DemoReset() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    const ok = window.confirm(
      "데모를 시드 직후 상태로 되돌릴까요?\n\n" +
        "그동안 가입한 계정·대화·업로드한 커버 이미지·작성한 공지가 전부 사라지고,\n" +
        "큐레이션 플롯 12개와 시드 유저 800명이 다시 채워져요.",
    );
    if (!ok) return;

    setPending(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/admin/demo-reset", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "초기화하지 못했어요.");
        return;
      }
      const data = (await res.json()) as { counts: Counts };
      setDone(data.counts);
      router.refresh();
    } catch {
      setError("서버에 연결하지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-bold">데모 초기화</p>
        <p className="mt-0.5 text-[12px] text-text-sub">
          시드 직후 상태로 되돌려요. 공개 데모라 데이터가 흐트러졌을 때 쓰세요 —
          <code className="mx-1 text-text-faint">pnpm db:seed</code>와 같은 동작입니다.
        </p>
        {done && (
          <p className="mt-1 text-[12px] text-success">
            초기화 완료 · 플롯 {done.plots} · 유저 {done.users} · 공지 {done.notices}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-1 text-[12px] text-danger">
            {error}
          </p>
        )}
      </div>
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => void reset()}>
        {pending ? "초기화 중…" : "초기 상태로 되돌리기"}
      </Button>
    </Card>
  );
}
