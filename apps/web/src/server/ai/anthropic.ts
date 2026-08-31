import type { ChatTurn, ProviderConfig } from "@/lib/ai/types";
import { ChatProxyError, readUpstreamError } from "./errors";
import { fetchUpstream } from "./http";
import { sseToTextStream } from "./sse";

/** Anthropic Messages API 스트리밍 */
export async function streamAnthropic(
  cfg: ProviderConfig,
  system: string,
  messages: ChatTurn[],
  signal: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  if (!cfg.apiKey) throw new ChatProxyError("Anthropic API 키를 입력해 주세요.");
  if (!cfg.model) throw new ChatProxyError("모델 이름을 입력해 주세요.");
  const baseUrl = (cfg.baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");

  const res = await fetchUpstream(
    `${baseUrl}/v1/messages`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model,
        system,
        messages,
        stream: true,
        max_tokens: 1024,
      }),
    },
    signal,
  );

  if (!res.ok) throw new ChatProxyError(await readUpstreamError(res));
  if (!res.body) throw new ChatProxyError("업스트림 응답에 본문이 없어요.");

  return sseToTextStream(res.body, (data) => {
    const d = data as {
      type?: string;
      delta?: { type?: string; text?: string };
    };
    return d.type === "content_block_delta" && d.delta?.type === "text_delta"
      ? d.delta.text
      : undefined;
  });
}
