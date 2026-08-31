import type { ChatTurn, ProviderConfig } from "@/lib/ai/types";
import { ChatProxyError, readUpstreamError } from "./errors";
import { fetchUpstream } from "./http";
import { sseToTextStream } from "./sse";

/** OpenAI 호환 chat/completions 스트리밍 (OpenAI, OpenRouter, Ollama /v1 등) */
export async function streamOpenAI(
  cfg: ProviderConfig,
  system: string,
  messages: ChatTurn[],
  signal: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const baseUrl = (cfg.baseUrl ?? "").replace(/\/+$/, "");
  if (!baseUrl) throw new ChatProxyError("엔드포인트 주소를 입력해 주세요.");
  if (!cfg.model) throw new ChatProxyError("모델 이름을 입력해 주세요.");

  const res = await fetchUpstream(
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    },
    signal,
  );

  if (!res.ok) throw new ChatProxyError(await readUpstreamError(res));
  if (!res.body) throw new ChatProxyError("업스트림 응답에 본문이 없어요.");

  return sseToTextStream(res.body, (data) => {
    const d = data as { choices?: { delta?: { content?: string } }[] };
    return d.choices?.[0]?.delta?.content;
  });
}
