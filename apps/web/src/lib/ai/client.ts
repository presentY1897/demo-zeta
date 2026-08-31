"use client";

import type { ChatRequestBody } from "./types";

/** /api/chat 을 호출해 텍스트 청크를 순서대로 내보낸다 */
export async function* streamChat(
  body: ChatRequestBody,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let message = "AI 응답 연결에 실패했어요.";
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      /* 본문 없음 */
    }
    throw new Error(message);
  }
  if (!res.body) throw new Error("응답 스트림을 열지 못했어요.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
