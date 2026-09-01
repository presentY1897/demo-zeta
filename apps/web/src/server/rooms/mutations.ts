import { and, eq, gte, sql } from "drizzle-orm";
import { chatRooms, messages, plots, type Database } from "@theta/db";
import type { ChatMessage } from "@/lib/chat-types";
import { loadMessages } from "./queries";

export type OpenRoomResult =
  | { ok: true; roomId: string; messages: ChatMessage[]; created: boolean }
  | { ok: false; status: number; message: string };

/**
 * 방 개설 — 접근 가능한 플롯(공개 또는 본인 것)에만 열 수 있다.
 * `UNIQUE(user_id, plot_id)`가 있어 재호출은 기존 방을 그대로 돌려준다(idempotent).
 */
export async function openRoom(
  db: Database,
  userId: string,
  plotId: string,
): Promise<OpenRoomResult> {
  const found = await db
    .select({
      id: plots.id,
      ownerId: plots.ownerId,
      visibility: plots.visibility,
      firstMessage: plots.firstMessage,
    })
    .from(plots)
    .where(eq(plots.id, plotId))
    .limit(1);

  const plot = found[0];
  // 비공개 플롯은 존재 여부를 드러내지 않는다 — 미존재와 같은 404
  if (!plot || (plot.visibility === "private" && plot.ownerId !== userId))
    return { ok: false, status: 404, message: "플롯을 찾을 수 없어요." };

  const existing = await db
    .select({ id: chatRooms.id })
    .from(chatRooms)
    .where(and(eq(chatRooms.userId, userId), eq(chatRooms.plotId, plotId)))
    .limit(1);

  if (existing[0]) {
    return {
      ok: true,
      roomId: existing[0].id,
      messages: await loadMessages(db, existing[0].id),
      created: false,
    };
  }

  const roomId = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(chatRooms)
      .values({ userId, plotId })
      .onConflictDoNothing({ target: [chatRooms.userId, chatRooms.plotId] })
      .returning({ id: chatRooms.id });

    // 동시 개설 경합 — 유니크 제약이 이긴 쪽의 방을 쓴다
    if (!inserted[0]) {
      const raced = await tx
        .select({ id: chatRooms.id })
        .from(chatRooms)
        .where(and(eq(chatRooms.userId, userId), eq(chatRooms.plotId, plotId)))
        .limit(1);
      return raced[0]!.id;
    }

    const id = inserted[0].id;
    // 캐릭터의 첫 메시지가 언제나 seq 0 — 초기화·잘라내기의 기준점이 된다
    await tx.insert(messages).values({
      roomId: id,
      seq: 0,
      role: "assistant",
      content: plot.firstMessage,
    });
    await tx
      .update(plots)
      .set({ chatsCount: sql`${plots.chatsCount} + 1` })
      .where(eq(plots.id, plotId));
    return id;
  });

  return { ok: true, roomId, messages: await loadMessages(db, roomId), created: true };
}

/** 지정 seq부터 끝까지 삭제. seq 0(첫 메시지)은 지울 수 없다 */
export async function truncateFrom(
  db: Database,
  roomId: string,
  fromSeq: number,
): Promise<number> {
  const removed = await db
    .delete(messages)
    .where(and(eq(messages.roomId, roomId), gte(messages.seq, fromSeq)))
    .returning({ seq: messages.seq });
  if (removed.length > 0) await touchRoom(db, roomId);
  return removed.length;
}

/** 첫 메시지만 남기고 비운다 */
export async function resetRoom(db: Database, roomId: string): Promise<void> {
  await truncateFrom(db, roomId, 1);
  await touchRoom(db, roomId);
}

/**
 * 메시지 추가. seq는 방 안에서 `max(seq)+1`로 채번하고,
 * 트랜잭션 밖의 경합은 `UNIQUE(room_id, seq)`가 최종 방어선이 된다.
 *
 * `expectedSeq`를 주면 채번 결과가 그 값일 때만 저장한다 — 스트리밍이 끝난 뒤에 저장이
 * 일어나는 구조라, 그 사이 초기화·잘라내기가 끼어들면 엉뚱한 자리에 응답이 붙는다.
 * 그 경우 저장을 건너뛰고 null을 돌려준다(유저가 지운 대화가 되살아나지 않게).
 */
export async function appendMessage(
  db: Database,
  roomId: string,
  message: { role: "user" | "assistant"; content: string; interrupted?: boolean },
  options: { expectedSeq?: number } = {},
): Promise<number | null> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ next: sql<number>`coalesce(max(${messages.seq}), -1) + 1` })
      .from(messages)
      .where(eq(messages.roomId, roomId));
    const seq = rows[0]?.next ?? 0;
    if (options.expectedSeq !== undefined && options.expectedSeq !== seq) return null;

    await tx.insert(messages).values({
      roomId,
      seq,
      role: message.role,
      content: message.content,
      interrupted: message.interrupted ?? false,
    });
    await tx.update(chatRooms).set({ updatedAt: new Date() }).where(eq(chatRooms.id, roomId));
    return seq;
  });
}

export async function touchRoom(db: Database, roomId: string): Promise<void> {
  await db.update(chatRooms).set({ updatedAt: new Date() }).where(eq(chatRooms.id, roomId));
}
