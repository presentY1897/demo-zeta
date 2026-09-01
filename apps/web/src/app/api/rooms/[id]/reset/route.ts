import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { requireActiveUser, requireOwnedRoom } from "@/server/rooms/http";
import { resetRoom } from "@/server/rooms/mutations";
import { loadMessages } from "@/server/rooms/queries";

export const runtime = "nodejs";

/** 첫 메시지만 남기고 대화를 비운다 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireActiveUser(req);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const room = await requireOwnedRoom(id, guard.value);
  if (!room.ok) return room.response;

  await resetRoom(db, id);
  return NextResponse.json({ messages: await loadMessages(db, id) });
}
