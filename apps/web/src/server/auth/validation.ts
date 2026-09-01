export const NICKNAME_MAX = 20;
export const PASSWORD_MIN = 8;

/** 데모 범위에서 충분한 수준의 형식 검사 — 실서비스라면 이메일 본인확인이 붙는다 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeNickname(nickname: string): string {
  return nickname.trim().replace(/\s+/g, " ");
}

export function nicknameError(nickname: string): string | null {
  if (nickname.length < 1) return "닉네임을 입력해 주세요.";
  if (nickname.length > NICKNAME_MAX) return `닉네임은 ${NICKNAME_MAX}자까지 쓸 수 있어요.`;
  return null;
}

export function passwordError(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.`;
  return null;
}
