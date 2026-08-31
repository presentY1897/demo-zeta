/**
 * 업스트림 SSE 응답을 순수 텍스트 청크 스트림으로 변환한다.
 * extract가 각 data 페이로드에서 텍스트 델타를 꺼낸다.
 */
export function sseToTextStream(
  upstream: ReadableStream<Uint8Array>,
  extract: (data: unknown) => string | undefined,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = "";

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const text = extract(JSON.parse(payload));
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              /* 불완전한 JSON 라인은 건너뛴다 */
            }
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      } finally {
        reader.releaseLock();
      }
    },
    cancel(reason) {
      void upstream.cancel(reason).catch(() => {});
    },
  });
}
