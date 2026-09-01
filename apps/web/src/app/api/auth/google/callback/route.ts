import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { findOrCreateGoogleUser } from "@/server/auth/core";
import { issueSession } from "@/server/auth/session";
import { readCookie, withSessionCookie } from "@/server/auth/http";
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  callbackUrl,
  exchangeCode,
  googleConfig,
} from "@/server/auth/google";

export const runtime = "nodejs";

/** 실패는 전부 로그인 화면으로 되돌리고 사유를 쿼리로 전달한다 */
function backToLogin(req: Request, message: string): NextResponse {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(req: Request): Promise<NextResponse> {
  const config = googleConfig();
  if (!config) return NextResponse.redirect(new URL("/login", req.url));

  const params = new URL(req.url).searchParams;
  if (params.get("error")) return backToLogin(req, "구글 로그인이 취소됐어요.");

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = readCookie(req, GOOGLE_STATE_COOKIE);
  const codeVerifier = readCookie(req, GOOGLE_VERIFIER_COOKIE);

  // state 불일치 = CSRF 방어선
  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier)
    return backToLogin(req, "로그인 요청이 만료됐어요. 다시 시도해 주세요.");

  const exchanged = await exchangeCode(config, {
    code,
    codeVerifier,
    redirectUri: callbackUrl(req),
  });
  if (!exchanged.ok) return backToLogin(req, exchanged.message);

  const result = await findOrCreateGoogleUser(db, exchanged.identity);
  if (!result.ok) return backToLogin(req, result.message);

  const session = await issueSession(db, result.user.id);
  const res = withSessionCookie(NextResponse.redirect(new URL("/", req.url)), session);
  res.cookies.delete(GOOGLE_STATE_COOKIE);
  res.cookies.delete(GOOGLE_VERIFIER_COOKIE);
  return res;
}
