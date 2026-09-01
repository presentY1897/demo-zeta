import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { chatRooms, messages, plots, type Database } from "@theta/db";
import type { ChatMessage, RoomSummary } from "@/lib/chat-types";

/** /api/chat이 프롬프트를 조립할 때 필요한 방의 문맥 — 페르소나는 서버 밖으로 나가지 않는다 */
export interface RoomContext {
  roomId: string;
  plotId: string;
  plotName: string;
  persona: string;
  description: string;
  firstMessage: string;
}

/** 방의 소유자 확인을 겸한 조회 — 남의 방이면 null */
export async function getOwnedRoomContext(
  db: Database,
  roomId: string,
  userId: string,
): Promise<RoomContext | null> {
  const rows = await db
    .select({
      roomId: chatRooms.id,
      plotId: plots.id,
      plotName: plots.name,
      persona: plots.persona,
      description: plots.description,
      firstMessage: plots.firstMessage,
    })
    .from(chatRooms)
    .innerJoin(plots, eq(chatRooms.plotId, plots.id))
    .where(and(eq(chatRooms.id, roomId), eq(chatRooms.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function loadMessages(
  db: Database,
  roomId: string,
  limit?: number,
): Promise<ChatMessage[]> {
  const rows = await db
    .select({
      seq: messages.seq,
      role: messages.role,
      content: messages.content,
      interrupted: messages.interrupted,
    })
    .from(messages)
    .where(eq(messages.roomId, roomId))
    .orderBy(asc(messages.seq));

  return limit !== undefined && rows.length > limit ? rows.slice(-limit) : rows;
}

/** 대화 목록 — 방마다 마지막 메시지 한 줄을 함께 가져온다 */
export async function listRooms(db: Database, userId: string): Promise<RoomSummary[]> {
  const lastMessage = db
    .select({
      roomId: messages.roomId,
      content: messages.content,
      rank: sql<number>`row_number() over (partition by ${messages.roomId} order by ${messages.seq} desc)`.as(
        "rank",
      ),
    })
    .from(messages)
    .as("last_message");

  const rows = await db
    .select({
      id: chatRooms.id,
      plotId: plots.id,
      plotName: plots.name,
      emoji: plots.emoji,
      gradientFrom: plots.gradientFrom,
      gradientTo: plots.gradientTo,
      lastMessage: lastMessage.content,
      updatedAt: chatRooms.updatedAt,
    })
    .from(chatRooms)
    .innerJoin(plots, eq(chatRooms.plotId, plots.id))
    .leftJoin(lastMessage, and(eq(lastMessage.roomId, chatRooms.id), eq(lastMessage.rank, 1)))
    .where(eq(chatRooms.userId, userId))
    .orderBy(desc(chatRooms.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    plotId: r.plotId,
    plotName: r.plotName,
    emoji: r.emoji,
    gradient: [r.gradientFrom, r.gradientTo] as [string, string],
    lastMessage: r.lastMessage,
    updatedAt: r.updatedAt.getTime(),
  }));
}

/** 유저가 이미 연 방이 있으면 그 방과 메시지를 준다(없으면 null — 개설은 POST /api/rooms) */
export async function findRoomWithMessages(
  db: Database,
  userId: string,
  plotId: string,
): Promise<{ id: string; messages: ChatMessage[] } | null> {
  const rows = await db
    .select({ id: chatRooms.id })
    .from(chatRooms)
    .where(and(eq(chatRooms.userId, userId), eq(chatRooms.plotId, plotId)))
    .limit(1);

  const room = rows[0];
  if (!room) return null;
  return { id: room.id, messages: await loadMessages(db, room.id) };
}

export async function countMessagesFrom(
  db: Database,
  roomId: string,
  fromSeq: number,
): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(eq(messages.roomId, roomId), gte(messages.seq, fromSeq)));
  return rows[0]?.n ?? 0;
}
