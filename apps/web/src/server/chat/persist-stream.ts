/**
 * 통과하는 텍스트를 서버에서 누적해 두었다가, 스트림이 끝나거나 중단되면 한 번만 알려준다.
 * 클라이언트가 중간에 끊어도(중단 버튼·탭 닫기) 받은 데까지는 저장되게 하는 장치다.
 */
export function persistingStream(
  source: ReadableStream<Uint8Array>,
  onSettled: (text: string, interrupted: boolean) => void,
): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let settled = false;

  const settle = (interrupted: boolean) => {
    if (settled) return;
    settled = true;
    accumulated += decoder.decode();
    onSettled(accumulated, interrupted);
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          settle(false);
          controller.close();
          return;
        }
        accumulated += decoder.decode(value, { stream: true });
        controller.enqueue(value);
      } catch (e) {
        // 업스트림이 끊겼거나 클라이언트 abort가 전파된 경우 — 받은 데까지는 남긴다
        settle(true);
        controller.error(e);
      }
    },
    async cancel(reason) {
      settle(true);
      await reader.cancel(reason).catch(() => {});
    },
  });
}
