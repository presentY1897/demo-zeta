import { createHash } from "node:crypto";

/**
 * 이름에서 항상 같은 UUID를 만든다(UUID v5와 동일한 방식).
 * 시드가 uuid PK 테이블(공지 등)을 재삽입해도 id가 바뀌지 않아
 * "시드 재실행 = 동일 상태"가 성립한다.
 */
export function stableUuid(name: string): string {
  const hash = createHash("sha1").update(`theta:${name}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50; // version 5
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variant
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}
