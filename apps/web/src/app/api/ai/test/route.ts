import type { NextRequest } from "next/server";
import type { ChatTurn, ProviderConfig } from "@/lib/ai/types";
import { ChatProxyError } from "@/server/ai/errors";
import { mockStream } from "@/server/ai/mock";
import { streamOpenAI } from "@/server/ai/openai";
import { streamAnthropic } from "@/server/ai/anthropic";

export const runtime = "nodejs";

const SYSTEM = "당신은 연결 테스트 응답기입니다. 한 문장으로 짧게 인사하세요.";
const TURNS: ChatTurn[] = [{ role: "user", content: "안녕하세요!" }];

/**
 * BYOK 연결 테스트 — 실제 스트림을 열어 보되 대화방과 무관하다.
 * /api/chat은 방·영속화가 전제라 설정 화면에서 쓸 수 없어 경로를 분리했다.
 */
export async function POST(req: NextRequest): Promise<Response> {
  let provider: ProviderConfig;
  try {
    provider = ((await req.json()) as { provider: ProviderConfig }).provider;
  } catch {
    return Response.json({ error: "잘못된 요청 형식이에요." }, { status: 400 });
  }
  if (!provider?.kind) return Response.json({ error: "잘못된 요청 형식이에요." }, { status: 400 });

  try {
    const stream =
      provider.kind === "mock"
        ? mockStream("세타", TURNS)
        : provider.kind === "anthropic"
          ? await streamAnthropic(provider, SYSTEM, TURNS, req.signal)
          : await streamOpenAI(provider, SYSTEM, TURNS, req.signal);

    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-accel-buffering": "no",
      },
    });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    const message = e instanceof ChatProxyError ? e.message : "AI 응답 연결에 실패했어요.";
    return Response.json({ error: message }, { status: 502 });
  }
}
