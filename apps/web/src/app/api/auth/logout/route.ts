import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { readSessionToken, withClearedSessionCookie } from "@/server/auth/http";
import { revokeSession } from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  await revokeSession(db, readSessionToken(req));
  return withClearedSessionCookie(NextResponse.json({ ok: true }));
}
