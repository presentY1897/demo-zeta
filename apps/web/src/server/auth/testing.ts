import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "./session";

/** 통합 테스트용 — 핸들러에 넘길 JSON 요청을 만든다 */
export function jsonRequest(
  url: string,
  body: unknown,
  options: { cookies?: Record<string, string>; method?: string } = {},
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  const cookie = cookieHeader(options.cookies);
  if (cookie) headers.set("cookie", cookie);
  return new Request(url, {
    method: options.method ?? "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export function getRequest(url: string, cookies?: Record<string, string>): Request {
  const headers = new Headers();
  const cookie = cookieHeader(cookies);
  if (cookie) headers.set("cookie", cookie);
  return new Request(url, { headers });
}

function cookieHeader(cookies?: Record<string, string>): string | null {
  if (!cookies) return null;
  const parts = Object.entries(cookies).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return parts.length > 0 ? parts.join("; ") : null;
}

/** 응답에 실린 세션 쿠키 값 (로그아웃 시에는 빈 문자열) */
export function sessionCookieOf(res: NextResponse): string | undefined {
  return res.cookies.get(SESSION_COOKIE)?.value;
}
