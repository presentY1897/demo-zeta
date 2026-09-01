import { NextResponse } from "next/server";
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  callbackUrl,
  createAuthorizationRequest,
  googleConfig,
} from "@/server/auth/google";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const config = googleConfig();
  // 키 미설정 = 기능 없음. 로그인 화면에도 버튼이 뜨지 않는다
  if (!config) return NextResponse.redirect(new URL("/login", req.url));

  const auth = createAuthorizationRequest(config.clientId, callbackUrl(req));
  const res = NextResponse.redirect(auth.url);
  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  } as const;
  res.cookies.set({ ...options, name: GOOGLE_STATE_COOKIE, value: auth.state });
  res.cookies.set({ ...options, name: GOOGLE_VERIFIER_COOKIE, value: auth.codeVerifier });
  return res;
}
