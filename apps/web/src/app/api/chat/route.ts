import type { NextRequest } from "next/server";
import type { ChatRequestBody, ChatTurn } from "@/lib/ai/types";
import { ChatProxyError } from "@/server/ai/errors";
import { mockStream } from "@/server/ai/mock";
import { streamOpenAI } from "@/server/ai/openai";
import { streamAnthropic } from "@/server/ai/anthropic";

export const runtime = "nodejs";

const MAX_TURNS = 40;
const MAX_CONTENT = 8_000;

/** 클라이언트 입력을 프로바이더에 넘기기 전 정리 */
function sanitizeMessages(raw: unknown): ChatTurn[] | null {
  if (!Array.isArray(raw)) return null;
  const turns: ChatTurn[] = [];
  for (const m of raw.slice(-MAX_TURNS)) {
    const t = m as { role?: unknown; content?: unknown };
    if (
      (t.role !== "user" && t.role !== "assistant") ||
      typeof t.content !== "string"
    ) {
      return null;
    }
    turns.push({ role: t.role, content: t.content.slice(0, MAX_CONTENT) });
  }
  return turns;
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "잘못된 요청 형식이에요." }, { status: 400 });
  }

  const messages = sanitizeMessages(body.messages);
  const kind = body.provider?.kind;
  if (!messages || !kind) {
    return Response.json({ error: "잘못된 요청 형식이에요." }, { status: 400 });
  }

  try {
    const stream =
      kind === "mock"
        ? mockStream(body.plotName || "상대", messages)
        : kind === "anthropic"
          ? await streamAnthropic(body.provider, body.system ?? "", messages, req.signal)
          : await streamOpenAI(body.provider, body.system ?? "", messages, req.signal);

    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        // 프록시가 스트리밍을 버퍼링하지 않도록
        "x-accel-buffering": "no",
      },
    });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    const message =
      e instanceof ChatProxyError ? e.message : "AI 응답 연결에 실패했어요.";
    return Response.json({ error: message }, { status: 502 });
  }
}
