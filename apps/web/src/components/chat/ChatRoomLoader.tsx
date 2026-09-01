"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@theta/ui";
import type { ChatMessage } from "@/lib/chat-types";
import type { PlotView } from "@/lib/plot-view";
import { ChatRoom } from "./ChatRoom";

interface Opened {
  roomId: string;
  messages: ChatMessage[];
}

/**
 * 방이 이미 있으면 서버(RSC)가 넘겨준 것을 그대로 쓰고,
 * 없을 때만 POST /api/rooms로 개설한다 — 페이지 렌더가 쓰기를 하지 않게 하려는 구성.
 */
export function ChatRoomLoader({
  plot,
  initial,
}: {
  plot: PlotView;
  initial: Opened | null;
}) {
  const [opened, setOpened] = useState<Opened | null>(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plotId: plot.id }),
        });
        const data = (await res.json().catch(() => ({}))) as Partial<Opened> & { error?: string };
        if (cancelled) return;
        if (!res.ok || !data.roomId) {
          setError(data.error ?? "대화방을 열지 못했어요.");
          return;
        }
        setOpened({ roomId: data.roomId, messages: data.messages ?? [] });
      } catch {
        if (!cancelled) setError("네트워크 오류예요. 연결을 확인해 주세요.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opened, plot.id]);

  if (error) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-text-sub">{error}</p>
        <a
          href="/chat"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
        >
          대화 목록으로
        </a>
      </div>
    );
  }

  if (!opened) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <ChatRoom plot={plot} roomId={opened.roomId} initialMessages={opened.messages} />;
}
