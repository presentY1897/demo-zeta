import { NextResponse } from "next/server";
import { SESSION_COOKIE, type IssuedSession } from "./session";

/**
 * Request의 Cookie 헤더를 직접 판다 — next/headers에 의존하지 않아
 * 통합 테스트가 dev 서버 없이 핸들러를 그대로 호출할 수 있다.
 */
export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

export function readSessionToken(req: Request): string | null {
  return readCookie(req, SESSION_COOKIE);
}

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

export function withSessionCookie<T>(res: NextResponse<T>, session: IssuedSession): NextResponse<T> {
  res.cookies.set({
    ...baseCookieOptions,
    name: SESSION_COOKIE,
    value: session.token,
    expires: session.expiresAt,
  });
  return res;
}

export function withClearedSessionCookie<T>(res: NextResponse<T>): NextResponse<T> {
  res.cookies.set({ ...baseCookieOptions, name: SESSION_COOKIE, value: "", maxAge: 0 });
  return res;
}

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** 클라이언트에 내려보내도 되는 유저 필드만 추린다 */
export interface PublicUser {
  id: string;
  nickname: string;
  plan: "free" | "pass";
  hue: number;
  email: string;
  status: "active" | "suspended";
}

export function toPublicUser(u: {
  id: string;
  nickname: string;
  plan: "free" | "pass";
  hue: number;
  email: string;
  status: "active" | "suspended";
}): PublicUser {
  return {
    id: u.id,
    nickname: u.nickname,
    plan: u.plan,
    hue: u.hue,
    email: u.email,
    status: u.status,
  };
}
