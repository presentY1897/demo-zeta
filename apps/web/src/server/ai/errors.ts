/** 사용자에게 그대로 보여줄 수 있는 프록시 오류 메시지 */
export class ChatProxyError extends Error {}

export async function readUpstreamError(res: Response): Promise<string> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const json: unknown = JSON.parse(text);
      const j = json as { error?: { message?: string } | string; message?: string };
      detail =
        (typeof j.error === "object" ? j.error?.message : j.error) ??
        j.message ??
        text;
    } catch {
      detail = text;
    }
  } catch {
    /* 본문 없음 */
  }
  detail = detail.trim();
  // HTML 에러 페이지 등은 사용자 메시지로 노출하지 않는다
  if (detail.startsWith("<")) detail = "";
  detail = detail.slice(0, 200);
  return `업스트림 오류 (HTTP ${res.status})${detail ? `: ${detail}` : ""}`;
}
