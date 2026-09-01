import { db, type User } from "@theta/db";
import { jsonError, readSessionToken } from "@/server/auth/http";
import { findSessionUser } from "@/server/auth/session";
import { getOwnedRoomContext, type RoomContext } from "./queries";
import type { NextResponse } from "next/server";

export type Guard<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

/** 로그인 + 제재 여부까지 한 번에 — 채팅 경로는 제재 계정을 막아야 한다 */
export async function requireActiveUser(req: Request): Promise<Guard<User>> {
  const user = await findSessionUser(db, readSessionToken(req));
  if (!user) return { ok: false, response: jsonError(401, "로그인이 필요해요.") };
  if (user.status === "suspended")
    return { ok: false, response: jsonError(403, "제재된 계정이에요.") };
  return { ok: true, value: user };
}

/** 내 방인지 확인 — 남의 방은 404로 감춘다 */
export async function requireOwnedRoom(
  roomId: string,
  user: User,
): Promise<Guard<RoomContext>> {
  const room = await getOwnedRoomContext(db, roomId, user.id);
  if (!room) return { ok: false, response: jsonError(404, "대화방을 찾을 수 없어요.") };
  return { ok: true, value: room };
}
