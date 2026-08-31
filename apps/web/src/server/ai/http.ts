import { ChatProxyError } from "./errors";

const CONNECT_TIMEOUT_MS = 20_000;

/**
 * 응답 헤더 수신까지만 타임아웃을 건 fetch.
 * 헤더가 도착하면 타이머를 해제하므로 긴 스트리밍 본문은 제한하지 않는다.
 */
export async function fetchUpstream(
  url: string,
  init: RequestInit,
  clientSignal: AbortSignal,
): Promise<Response> {
  const connectTimeout = new AbortController();
  const timer = setTimeout(() => connectTimeout.abort(), CONNECT_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.any([clientSignal, connectTimeout.signal]),
    });
  } catch (e) {
    if (clientSignal.aborted) throw e;
    if (connectTimeout.signal.aborted) {
      throw new ChatProxyError(
        "엔드포인트 응답이 너무 늦어요. 주소를 확인해 주세요.",
      );
    }
    throw new ChatProxyError(
      "엔드포인트에 연결하지 못했어요. 주소와 네트워크를 확인해 주세요.",
    );
  } finally {
    clearTimeout(timer);
  }
}
