import { NextResponse } from "next/server";
import { ADMIN_COOKIE, checkAdminPassword, issueAdminToken } from "@/server/admin-auth";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD)
    return NextResponse.json(
      { error: "ADMIN_PASSWORD가 설정되지 않았어요. 루트 .env를 확인해 주세요." },
      { status: 500 },
    );

  if (!checkAdminPassword(body.password ?? ""))
    return NextResponse.json({ error: "비밀번호가 올바르지 않아요." }, { status: 401 });

  const { token, expiresAt } = issueAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return res;
}
