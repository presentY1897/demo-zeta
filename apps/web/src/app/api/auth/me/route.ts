import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { jsonError, readSessionToken, toPublicUser } from "@/server/auth/http";
import { findSessionUser } from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const user = await findSessionUser(db, readSessionToken(req));
  if (!user) return jsonError(401, "로그인이 필요해요.");
  return NextResponse.json({ user: toPublicUser(user) });
}
