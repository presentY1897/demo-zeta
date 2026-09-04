import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { jsonError } from "@/server/auth/http";
import { requireActiveUser, requireOwnedRoom } from "@/server/rooms/http";
import { replaceTail } from "@/server/rooms/mutations";
import { loadMessages } from "@/server/rooms/queries";

export const runtime = "nodejs";

const MAX_CONTENT = 8_000;

/**
 * 중단 신호 — 클라이언트가 "여기까지 받았다"를 서버에 알린다.
 *
 * 서버리스에서는 클라이언트가 연결을 끊어도 실행 중인 함수에 전파되지 않는다.
 * /api/chat은 스트림을 끝까지 돌려 전체 응답을 저장하므로, 중단은 클라이언트가
 * 명시적으로 알려 줘야 화면과 DB가 일치한다(로컬 dev에서는 스트림 취소도 함께 동작한다).
 *
 * `afterSeq` 뒤를 잘라내고 받은 데까지를 **한 트랜잭션 안에서** 다시 넣으므로, 원래 요청의
 * 저장이 먼저 끝났든 나중에 끝나든 최종 상태가 같다 — 늦게 도착한 저장은 자리가 어긋나
 * /api/chat의 expectedSeq 가드에 걸려 물러난다.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireActiveUser(req);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const room = await requireOwnedRoom(id, guard.value);
  if (!room.ok) return room.response;

  let body: { content?: unknown; afterSeq?: unknown };
  try {
    body = (await req.json()) as { content?: unknown; afterSeq?: unknown };
  } catch {
    return jsonError(400, "요청 형식이 올바르지 않아요.");
  }

  const afterSeq = Number(body.afterSeq);
  // seq 0은 캐릭터의 첫 메시지 — 그 뒤부터만 응답이 붙는다
  if (!Number.isInteger(afterSeq) || afterSeq < 0)
    return jsonError(400, "afterSeq는 0 이상의 정수여야 해요.");

  const content = typeof body.content === "string" ? body.content.slice(0, MAX_CONTENT) : "";

  // 잘라내기와 저장은 한 트랜잭션이어야 한다 — 나누면 그 틈에 늦은 저장이 끼어든다
  await replaceTail(db, id, afterSeq, content.trim() ? { content, interrupted: true } : null);

  return NextResponse.json({ messages: await loadMessages(db, id) });
}
