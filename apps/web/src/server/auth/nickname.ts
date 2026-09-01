import { NICKNAME_MAX } from "./validation";

/** 닉네임에서 아바타 색상(hue)을 결정 — 같은 닉네임은 항상 같은 색 */
export function hueFromNickname(nickname: string): number {
  let h = 0;
  for (const ch of nickname) h = (h * 31 + ch.codePointAt(0)!) % 360;
  return h;
}

/**
 * 구글 프로필 이름처럼 외부에서 온 이름을 닉네임으로 쓸 수 있게 다듬는다.
 * 빈 값이면 "세타유저"로 폴백한다.
 */
export function sanitizeNickname(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, "").slice(0, NICKNAME_MAX);
  return cleaned.length > 0 ? cleaned : "세타유저";
}

/**
 * 이미 쓰이는 닉네임이면 숫자 접미를 붙여 비어 있는 것을 찾는다 (달빛여우 → 달빛여우2 → …).
 * `taken` 주입으로 DB 없이도 규칙을 검증할 수 있다.
 */
export async function uniqueNickname(
  base: string,
  taken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const seed = sanitizeNickname(base);
  if (!(await taken(seed))) return seed;
  for (let n = 2; n < 10_000; n++) {
    const suffix = String(n);
    const candidate = seed.slice(0, NICKNAME_MAX - suffix.length) + suffix;
    if (!(await taken(candidate))) return candidate;
  }
  throw new Error("사용 가능한 닉네임을 찾지 못했습니다.");
}
