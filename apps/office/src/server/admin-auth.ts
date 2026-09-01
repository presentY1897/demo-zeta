import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 오피스 접근 보호 — 관리자 1명 전제라 DB 세션 없이 SESSION_SECRET으로 서명한 토큰 쿠키만 쓴다.
 * 폐기는 ADMIN_PASSWORD 또는 SESSION_SECRET 교체로 한다.
 * (next/headers에 의존하지 않아 통합 테스트가 핸들러를 직접 호출할 수 있다)
 */
export const ADMIN_COOKIE = "theta_admin";
export const ADMIN_TTL_MS = 12 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET이 설정되지 않았습니다. 루트 .env를 확인하세요.");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** `<만료시각>.<서명>` 형태의 토큰 */
export function issueAdminToken(now: number = Date.now()): { token: string; expiresAt: Date } {
  const expiresAt = now + ADMIN_TTL_MS;
  const payload = String(expiresAt);
  return { token: `${payload}.${sign(payload)}`, expiresAt: new Date(expiresAt) };
}

export function verifyAdminToken(token: string | null, now: number = Date.now()): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;

  const payload = token.slice(0, dot);
  const provided = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(payload));
  // 길이가 다르면 timingSafeEqual이 던지므로 먼저 거른다
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

/** 비밀번호가 설정돼 있지 않으면 아무도 통과시키지 않는다 */
export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function readAdminCookie(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === ADMIN_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

export function isAdminRequest(req: Request): boolean {
  return verifyAdminToken(readAdminCookie(req));
}
