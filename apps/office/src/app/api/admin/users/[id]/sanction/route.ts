import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { adminGuard, jsonError, readJsonObject } from "@/server/http";
import { setUserSuspended } from "@/server/users";

export const runtime = "nodejs";

/** 제재/해제 토글 — DB에 영속되고, 제재 시 해당 유저의 세션을 전부 끊는다 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = adminGuard(req);
  if (guard) return guard;

  const body = await readJsonObject(req);
  if (!body) return jsonError(400, "요청 형식이 올바르지 않아요.");
  if (typeof body.suspended !== "boolean")
    return jsonError(400, "suspended는 boolean이어야 해요.");

  const { id } = await params;
  const ok = await setUserSuspended(db, id, body.suspended);
  if (!ok) return jsonError(404, "유저를 찾을 수 없어요.");

  return NextResponse.json({ status: body.suspended ? "suspended" : "active" });
}
