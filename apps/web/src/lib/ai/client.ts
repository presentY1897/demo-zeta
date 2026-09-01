"use client";

import { USER_SEQ_HEADER } from "./types";
import type { ChatRequestBody, ProviderConfig } from "./types";

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* 본문 없음 */
  }
  return "AI 응답 연결에 실패했어요.";
}

async function* readTextStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
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

export interface ChatStreamResult {
  /** 서버가 저장한 유저 메시지의 seq — 없으면 이번 요청에서 새로 저장된 발화가 없다는 뜻 */
  userSeq: number | null;
  chunks: AsyncGenerator<string>;
}

/**
 * /api/chat 을 호출한다. 서버가 유저 메시지를 먼저 저장하므로,
 * 응답 헤더의 seq로 옵티미스틱하게 그린 메시지를 확정한다.
 */
export async function streamChat(
  body: ChatRequestBody,
  signal: AbortSignal,
): Promise<ChatStreamResult> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const rawSeq = res.headers.get(USER_SEQ_HEADER);
  const userSeq = rawSeq === null ? null : Number(rawSeq);

  if (!res.ok) {
    const error = new ChatRequestError(await readError(res), userSeq);
    throw error;
  }
  if (!res.body) throw new ChatRequestError("응답 스트림을 열지 못했어요.", userSeq);

  return { userSeq, chunks: readTextStream(res.body) };
}

/** 유저 메시지가 서버에 저장됐는지(=화면에 남겨도 되는지)를 함께 전달하는 에러 */
export class ChatRequestError extends Error {
  constructor(
    message: string,
    readonly userSeq: number | null,
  ) {
    super(message);
  }
}

/** BYOK 연결 테스트 — 대화방과 무관한 별도 엔드포인트를 쓴다 */
export async function* streamConnectionTest(
  provider: ProviderConfig,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch("/api/ai/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider }),
    signal,
  });
  if (!res.ok) throw new Error(await readError(res));
  if (!res.body) throw new Error("응답 스트림을 열지 못했어요.");
  yield* readTextStream(res.body);
}
