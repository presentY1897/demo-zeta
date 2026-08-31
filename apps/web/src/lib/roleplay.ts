export interface RoleplaySegment {
  type: "action" | "speech";
  text: string;
}

/**
 * `*지문* 대사` 형식의 롤플레잉 텍스트를 세그먼트로 분해한다.
 * 스트리밍 중 아직 닫히지 않은 `*`는 지문이 진행 중인 것으로 취급한다.
 */
export function parseRoleplay(text: string): RoleplaySegment[] {
  const segments: RoleplaySegment[] = [];
  let inAction = false;
  let buf = "";

  const flush = () => {
    if (buf.trim().length > 0) {
      segments.push({ type: inAction ? "action" : "speech", text: buf.trim() });
    }
    buf = "";
  };

  for (const ch of text) {
    if (ch === "*") {
      flush();
      inAction = !inAction;
    } else {
      buf += ch;
    }
  }
  flush();
  return segments;
}
