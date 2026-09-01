import { after, type NextRequest } from "next/server";
import { db } from "@theta/db";
import { USER_SEQ_HEADER } from "@/lib/ai/types";
import type { ChatRequestBody, ChatTurn, ProviderConfig } from "@/lib/ai/types";
import { ChatProxyError } from "@/server/ai/errors";
import { mockStream } from "@/server/ai/mock";
import { streamOpenAI } from "@/server/ai/openai";
import { streamAnthropic } from "@/server/ai/anthropic";
import { buildSystemPrompt } from "@/server/chat/prompt";
import { persistingStream } from "@/server/chat/persist-stream";
import { requireActiveUser, requireOwnedRoom } from "@/server/rooms/http";
import { appendMessage, touchRoom } from "@/server/rooms/mutations";
import { loadMessages } from "@/server/rooms/queries";
import { recordUsage } from "@/server/usage";

export const runtime = "nodejs";

const MAX_TURNS = 40;
const MAX_CONTENT = 8_000;

function jsonError(status: number, message: string, userSeq?: number): Response {
  const headers = userSeq === undefined ? undefined : { [USER_SEQ_HEADER]: String(userSeq) };
  return Response.json({ error: message }, { status, headers });
}

export async function POST(req: NextRequest): Promise<Response> {
  const auth = await requireActiveUser(req);
  if (!auth.ok) return auth.response;

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return jsonError(400, "잘못된 요청 형식이에요.");
  }

  const provider = body.provider;
  if (!provider?.kind || typeof body.roomId !== "string")
    return jsonError(400, "잘못된 요청 형식이에요.");

  const user = auth.value;
  const owned = await requireOwnedRoom(body.roomId, user);
  if (!owned.ok) return owned.response;
  const room = owned.value;

  // 새 발화가 있으면 스트리밍 전에 먼저 저장한다 — 업스트림이 실패해도 유저 메시지는 남는다
  let userSeq: number | undefined;
  if (typeof body.userMessage === "string" && body.userMessage.trim()) {
    userSeq =
      (await appendMessage(db, room.roomId, {
        role: "user",
        content: body.userMessage.trim().slice(0, MAX_CONTENT),
      })) ?? undefined;
  }

  const all = await loadMessages(db, room.roomId);
  // 응답이 붙어야 할 자리 — 저장 시점에 대화가 잘려 있으면 저장을 건너뛴다
  const expectedSeq = (all[all.length - 1]?.seq ?? -1) + 1;
  const history = all.length > MAX_TURNS ? all.slice(-MAX_TURNS) : all;
  const turns: ChatTurn[] = history.map((m) => ({
    role: m.role,
    content: m.content.slice(0, MAX_CONTENT),
  }));
  const system = buildSystemPrompt(room);

  let upstream: ReadableStream<Uint8Array>;
  try {
    upstream = await openUpstream(provider, system, room.plotName, turns, req.signal);
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    const message = e instanceof ChatProxyError ? e.message : "AI 응답 연결에 실패했어요.";
    return jsonError(502, message, userSeq);
  }

  // 응답이 끝난 뒤에도 저장이 끝날 때까지 함수가 살아 있도록 보장한다
  let finish: () => void = () => {};
  keepAliveUntil(new Promise<void>((resolve) => (finish = resolve)));

  const promptText = [system, ...turns.map((t) => t.content)].join("\n");
  const stream = persistingStream(upstream, (text, interrupted) => {
    void persist(text, interrupted).finally(finish);
  });

  async function persist(text: string, interrupted: boolean): Promise<void> {
    try {
      if (!text.trim()) {
        // 빈 응답 — assistant 메시지를 만들지 않는다(클라이언트가 "다시 시도" UX로 복구)
        await touchRoom(db, room.roomId);
        return;
      }
      const seq = await appendMessage(
        db,
        room.roomId,
        { role: "assistant", content: text, interrupted },
        { expectedSeq },
      );
      // 저장하는 사이 초기화·잘라내기가 끼어들었다면 사용 기록도 남기지 않는다
      if (seq === null) return;

      await recordUsage(db, {
        userId: user.id,
        plotId: room.plotId,
        providerKind: provider.kind,
        model: provider.kind === "mock" ? "mock" : (provider.model ?? "unknown"),
        promptText,
        responseText: text,
      });
    } catch (e) {
      console.error("[chat] 응답 저장 실패", e);
    }
  }

  const headers = new Headers({
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    // 프록시가 스트리밍을 버퍼링하지 않도록
    "x-accel-buffering": "no",
  });
  if (userSeq !== undefined) headers.set(USER_SEQ_HEADER, String(userSeq));

  return new Response(stream, { headers });
}

/**
 * 서버리스에서 응답 스트림이 끝난 뒤에도 저장이 마무리되게 한다.
 * 통합 테스트는 요청 스코프 없이 핸들러를 직접 호출하므로 after()가 던지는데,
 * 그 경우 저장은 그대로 진행되고 테스트가 완료를 폴링한다.
 */
function keepAliveUntil(promise: Promise<unknown>): void {
  try {
    after(promise);
  } catch {
    /* 요청 스코프 밖 — 무시 */
  }
}

function openUpstream(
  provider: ProviderConfig,
  system: string,
  plotName: string,
  turns: ChatTurn[],
  signal: AbortSignal,
): Promise<ReadableStream<Uint8Array>> | ReadableStream<Uint8Array> {
  if (provider.kind === "mock") return mockStream(plotName, turns);
  if (provider.kind === "anthropic") return streamAnthropic(provider, system, turns, signal);
  return streamOpenAI(provider, system, turns, signal);
}
