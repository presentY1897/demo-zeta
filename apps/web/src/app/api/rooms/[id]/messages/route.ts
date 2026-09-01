import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { jsonError } from "@/server/auth/http";
import { requireActiveUser, requireOwnedRoom } from "@/server/rooms/http";
import { truncateFrom } from "@/server/rooms/mutations";

export const runtime = "nodejs";

/** 재생성·수정 후 다시 보내기에서 대화 꼬리를 잘라낸다 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireActiveUser(req);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const room = await requireOwnedRoom(id, guard.value);
  if (!room.ok) return room.response;

  const raw = new URL(req.url).searchParams.get("fromSeq");
  const fromSeq = Number(raw);
  // seq 0은 캐릭터의 첫 메시지 — 잘라내기 대상이 아니다
  if (!Number.isInteger(fromSeq) || fromSeq < 1)
    return jsonError(400, "fromSeq는 1 이상의 정수여야 해요.");

  const removed = await truncateFrom(db, id, fromSeq);
  return NextResponse.json({ removed });
}
