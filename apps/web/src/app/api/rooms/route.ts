import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { jsonError } from "@/server/auth/http";
import { requireActiveUser } from "@/server/rooms/http";
import { listRooms } from "@/server/rooms/queries";
import { openRoom } from "@/server/rooms/mutations";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const guard = await requireActiveUser(req);
  if (!guard.ok) return guard.response;
  return NextResponse.json({ rooms: await listRooms(db, guard.value.id) });
}

export async function POST(req: Request): Promise<NextResponse> {
  const guard = await requireActiveUser(req);
  if (!guard.ok) return guard.response;

  let body: { plotId?: unknown };
  try {
    body = (await req.json()) as { plotId?: unknown };
  } catch {
    return jsonError(400, "요청 형식이 올바르지 않아요.");
  }
  if (typeof body.plotId !== "string" || !body.plotId)
    return jsonError(400, "plotId가 필요해요.");

  const result = await openRoom(db, guard.value.id, body.plotId);
  if (!result.ok) return jsonError(result.status, result.message);

  return NextResponse.json(
    { roomId: result.roomId, messages: result.messages },
    { status: result.created ? 201 : 200 },
  );
}
