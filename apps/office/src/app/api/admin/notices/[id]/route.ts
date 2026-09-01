import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { deleteNotice, setNoticePinned } from "@/server/notices";
import { adminGuard, jsonError, readJsonObject } from "@/server/http";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 고정 토글 — 본문 `{ pinned: boolean }` */
export async function PATCH(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const denied = adminGuard(req);
  if (denied) return denied;

  const body = await readJsonObject(req);
  if (!body) return jsonError(400, "요청 형식이 올바르지 않아요.");

  const { id } = await ctx.params;
  const result = await setNoticePinned(db, id, body.pinned);
  if (!result.ok) return jsonError(result.status, result.message);
  return NextResponse.json({ notice: result.notice });
}

export async function DELETE(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const denied = adminGuard(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const result = await deleteNotice(db, id);
  if (!result.ok) return jsonError(result.status, result.message);
  return NextResponse.json({ ok: true });
}
