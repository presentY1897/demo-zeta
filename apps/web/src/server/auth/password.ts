import bcrypt from "bcryptjs";

const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

/**
 * 저장된 해시와 비교한다.
 * 해시가 없거나(구글 전용 계정) bcrypt 형식이 아니면(시드 유저 800명) 항상 실패 —
 * 비밀번호 로그인 경로가 원천적으로 열리지 않는다.
 */
export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash || !/^\$2[aby]\$/.test(hash)) return false;
  return bcrypt.compare(plain, hash);
}
