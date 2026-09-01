import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { createNotice } from "@/server/notices";
import { adminGuard, jsonError, readJsonObject } from "@/server/http";

export const runtime = "nodejs";

/** 공지 작성 — 작성 즉시 유저 앱(web) 공지 목록에 노출된다 */
export async function POST(req: Request): Promise<NextResponse> {
  const denied = adminGuard(req);
  if (denied) return denied;

  const body = await readJsonObject(req);
  if (!body) return jsonError(400, "요청 형식이 올바르지 않아요.");

  const result = await createNotice(db, body);
  if (!result.ok) return jsonError(result.status, result.message);
  return NextResponse.json({ notice: result.notice }, { status: 201 });
}
