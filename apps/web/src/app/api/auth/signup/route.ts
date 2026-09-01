import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { signup } from "@/server/auth/core";
import { issueSession } from "@/server/auth/session";
import { jsonError, toPublicUser, withSessionCookie } from "@/server/auth/http";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  let body: { email?: string; password?: string; nickname?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "요청 형식이 올바르지 않아요.");
  }

  const result = await signup(db, {
    email: body.email ?? "",
    password: body.password ?? "",
    nickname: body.nickname ?? "",
  });
  if (!result.ok) return jsonError(result.status, result.message);

  const session = await issueSession(db, result.user.id);
  return withSessionCookie(NextResponse.json({ user: toPublicUser(result.user) }), session);
}
