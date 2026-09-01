import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { chatRooms, messages, plots, usageEvents, users, type Database } from "@theta/db";
import { createTestDb, type TestDb } from "@theta/db/testing";
import { GET as listRooms, POST as openRoom } from "@/app/api/rooms/route";
import { DELETE as truncateRoute } from "@/app/api/rooms/[id]/messages/route";
import { POST as resetRoute } from "@/app/api/rooms/[id]/reset/route";
import { POST as chatRoute } from "@/app/api/chat/route";
import { USER_SEQ_HEADER } from "@/lib/ai/types";
import { issueSession, SESSION_COOKIE } from "@/server/auth/session";
import { appendMessage } from "@/server/rooms/mutations";
import { getRequest, jsonRequest } from "@/server/auth/testing";
import type { NextRequest } from "next/server";

const ORIGIN = "http://localhost:3000";

let t: TestDb;
let owner: Actor;
let stranger: Actor;
let plotId: string;

interface Actor {
  id: string;
  cookie: Record<string, string>;
}

async function makeUser(db: Database, nickname: string): Promise<Actor> {
  const [user] = await db
    .insert(users)
    .values({ email: `${nickname}@example.com`, nickname })
    .returning();
  const session = await issueSession(db, user!.id);
  return { id: user!.id, cookie: { [SESSION_COOKIE]: session.token } };
}

async function makePlot(
  ownerId: string,
  overrides: Partial<typeof plots.$inferInsert> = {},
): Promise<string> {
  const id = overrides.id ?? `plot-${Math.random().toString(36).slice(2, 10)}`;
  await t.db.insert(plots).values({
    id,
    ownerId,
    name: "이서준",
    tagline: "소개",
    description: "세계관",
    persona: "냉정하지만 다정하다",
    firstMessage: "*계약서를 밀어 놓는다* 조건은 간단해.",
    tags: ["로맨스"],
    emoji: "🖤",
    gradientFrom: "#000000",
    gradientTo: "#ffffff",
    ...overrides,
  });
  return id;
}

/** 방을 열고 id를 돌려준다 */
async function open(actor: Actor, id = plotId): Promise<string> {
  const res = await openRoom(jsonRequest(`${ORIGIN}/api/rooms`, { plotId: id }, { cookies: actor.cookie }));
  const body = (await res.json()) as { roomId: string };
  return body.roomId;
}

function chatRequest(
  actor: Actor,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): NextRequest {
  const req = jsonRequest(`${ORIGIN}/api/chat`, body, { cookies: actor.cookie });
  const withSignal = signal
    ? new Request(req, { signal })
    : req;
  return withSignal as NextRequest;
}

/**
 * 채팅 요청 한 번. 응답 저장은 스트림이 끝난 **뒤에** 일어나므로
 * (실서비스에서는 Next의 after()가 그 시간을 보장한다) 반영될 때까지 기다렸다가 돌려준다.
 */
async function chat(
  actor: Actor,
  body: { roomId: string; provider: unknown; userMessage?: string },
): Promise<{ res: Response; text: string }> {
  const res = await chatRoute(chatRequest(actor, body));
  if (!res.ok || !res.body) return { res, text: "" };
  const text = await res.text();
  await waitFor(async () => {
    const rows = await messagesOf(body.roomId);
    const last = rows[rows.length - 1];
    return last?.role === "assistant" && last.content === text;
  });
  return { res, text };
}

function messagesOf(roomId: string) {
  return t.db
    .select()
    .from(messages)
    .where(eq(messages.roomId, roomId))
    .orderBy(asc(messages.seq));
}

async function seqsOf(roomId: string): Promise<number[]> {
  const rows = await t.db
    .select({ seq: messages.seq })
    .from(messages)
    .where(eq(messages.roomId, roomId))
    .orderBy(asc(messages.seq));
  return rows.map((r) => r.seq);
}

beforeAll(async () => {
  t = await createTestDb();
}, 120_000);

afterAll(async () => {
  await t?.close();
});

beforeEach(async () => {
  await t.reset();
  owner = await makeUser(t.db, "주인");
  stranger = await makeUser(t.db, "남");
  plotId = await makePlot(owner.id, { chatsCount: 10 });
});

describe("방 개설", () => {
  it("첫 메시지가 seq 0으로 저장되고 대화수가 1 늘어난다", async () => {
    const res = await openRoom(
      jsonRequest(`${ORIGIN}/api/rooms`, { plotId }, { cookies: owner.cookie }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { roomId: string; messages: { seq: number; role: string }[] };
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]).toMatchObject({ seq: 0, role: "assistant" });

    const [plot] = await t.db.select().from(plots).where(eq(plots.id, plotId));
    expect(plot!.chatsCount).toBe(11);
  });

  it("다시 불러도 같은 방을 돌려주고 대화수는 그대로다 (idempotent)", async () => {
    const first = await open(owner);
    const res = await openRoom(
      jsonRequest(`${ORIGIN}/api/rooms`, { plotId }, { cookies: owner.cookie }),
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { roomId: string }).roomId).toBe(first);

    const [plot] = await t.db.select().from(plots).where(eq(plots.id, plotId));
    expect(plot!.chatsCount).toBe(11);
    expect(await t.db.select().from(chatRooms)).toHaveLength(1);
  });

  it("남의 비공개 플롯에는 방을 열 수 없다", async () => {
    const secret = await makePlot(owner.id, { visibility: "private" });
    const res = await openRoom(
      jsonRequest(`${ORIGIN}/api/rooms`, { plotId: secret }, { cookies: stranger.cookie }),
    );
    expect(res.status).toBe(404);
    expect(await t.db.select().from(chatRooms)).toHaveLength(0);
  });

  it("비로그인은 401, 제재 계정은 403", async () => {
    expect((await openRoom(jsonRequest(`${ORIGIN}/api/rooms`, { plotId }))).status).toBe(401);

    await t.db.update(users).set({ status: "suspended" }).where(eq(users.id, owner.id));
    const res = await openRoom(
      jsonRequest(`${ORIGIN}/api/rooms`, { plotId }, { cookies: owner.cookie }),
    );
    expect(res.status).toBe(403);
  });
});

describe("대화 목록", () => {
  it("마지막 메시지와 함께 최근 갱신순으로 준다", async () => {
    const otherPlot = await makePlot(owner.id, { name: "강무혁" });
    const roomA = await open(owner);
    await open(owner, otherPlot);
    // roomA를 나중에 갱신
    await chat(owner, { roomId: roomA, provider: { kind: "mock" }, userMessage: "안녕" });

    const res = await listRooms(getRequest(`${ORIGIN}/api/rooms`, owner.cookie));
    const { rooms } = (await res.json()) as {
      rooms: { id: string; plotName: string; lastMessage: string | null }[];
    };
    expect(rooms[0]!.id).toBe(roomA);
    expect(rooms).toHaveLength(2);
    expect(rooms[0]!.lastMessage).toBeTruthy();
  });

  it("남의 방은 목록에 없다", async () => {
    await open(owner);
    const res = await listRooms(getRequest(`${ORIGIN}/api/rooms`, stranger.cookie));
    expect(((await res.json()) as { rooms: unknown[] }).rooms).toHaveLength(0);
  });
});

describe("seq 채번", () => {
  it("expectedSeq가 맞을 때만 저장한다 — 늦게 도착한 응답이 지워진 대화를 되살리지 않게", async () => {
    const roomId = await open(owner);
    // 응답이 붙을 자리는 seq 1
    expect(await appendMessage(t.db, roomId, { role: "user", content: "먼저" }, { expectedSeq: 1 })).toBe(1);
    // 그 사이 대화가 잘려 자리가 달라진 상황
    expect(
      await appendMessage(t.db, roomId, { role: "assistant", content: "뒤늦게" }, { expectedSeq: 1 }),
    ).toBeNull();
    expect(await seqsOf(roomId)).toEqual([0, 1]);
    // 기대값을 주지 않으면 늘 맨 뒤에 붙는다
    expect(await appendMessage(t.db, roomId, { role: "assistant", content: "정상" })).toBe(2);
  });
});

describe("잘라내기와 초기화", () => {
  it("fromSeq 0은 거부한다 — 첫 메시지는 보호된다", async () => {
    const roomId = await open(owner);
    for (const value of ["0", "-1", "abc", ""]) {
      const res = await truncateRoute(
        getRequest(`${ORIGIN}/api/rooms/${roomId}/messages?fromSeq=${value}`, owner.cookie),
        { params: Promise.resolve({ id: roomId }) },
      );
      expect(res.status, value).toBe(400);
    }
    expect(await seqsOf(roomId)).toEqual([0]);
  });

  it("중간부터 끝까지 지운다", async () => {
    const roomId = await open(owner);
    await chat(owner, { roomId, provider: { kind: "mock" }, userMessage: "하나" });
    await chat(owner, { roomId, provider: { kind: "mock" }, userMessage: "둘" });
    expect(await seqsOf(roomId)).toEqual([0, 1, 2, 3, 4]);

    const res = await truncateRoute(
      getRequest(`${ORIGIN}/api/rooms/${roomId}/messages?fromSeq=3`, owner.cookie),
      { params: Promise.resolve({ id: roomId }) },
    );
    expect(res.status).toBe(200);
    expect(await seqsOf(roomId)).toEqual([0, 1, 2]);
  });

  it("초기화하면 seq 0만 남는다", async () => {
    const roomId = await open(owner);
    await chat(owner, { roomId, provider: { kind: "mock" }, userMessage: "하나" });

    const res = await resetRoute(getRequest(`${ORIGIN}/api/rooms/${roomId}/reset`, owner.cookie), {
      params: Promise.resolve({ id: roomId }),
    });
    expect(res.status).toBe(200);
    expect(await seqsOf(roomId)).toEqual([0]);
    expect(((await res.json()) as { messages: unknown[] }).messages).toHaveLength(1);
  });

  it("남의 방은 404로 감춘다", async () => {
    const roomId = await open(owner);
    const res = await truncateRoute(
      getRequest(`${ORIGIN}/api/rooms/${roomId}/messages?fromSeq=1`, stranger.cookie),
      { params: Promise.resolve({ id: roomId }) },
    );
    expect(res.status).toBe(404);
  });
});

describe("/api/chat 모의 경로", () => {
  it("유저·응답 메시지를 저장하고 usage_events를 남긴다", async () => {
    const roomId = await open(owner);
    const { res, text } = await chat(owner, {
      roomId,
      provider: { kind: "mock" },
      userMessage: "안녕하세요",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get(USER_SEQ_HEADER)).toBe("1");
    expect(text.length).toBeGreaterThan(10);

    const rows = await messagesOf(roomId);
    expect(rows.map((r) => r.role)).toEqual(["assistant", "user", "assistant"]);
    expect(rows[1]!.content).toBe("안녕하세요");
    expect(rows[2]!.content).toBe(text);
    expect(rows[2]!.interrupted).toBe(false);

    const usage = await t.db.select().from(usageEvents);
    expect(usage).toHaveLength(1);
    expect(usage[0]!.providerKind).toBe("mock");
    expect(usage[0]!.estInputTokens).toBeGreaterThan(0);
    expect(usage[0]!.estOutputTokens).toBeGreaterThan(0);

    const [room] = await t.db.select().from(chatRooms).where(eq(chatRooms.id, roomId));
    expect(room!.updatedAt.getTime()).toBeGreaterThan(room!.createdAt.getTime() - 1);
  });

  it("userMessage 없이 부르면 유저 메시지를 새로 저장하지 않는다 (재생성·재시도 경로)", async () => {
    const roomId = await open(owner);
    await chat(owner, { roomId, provider: { kind: "mock" }, userMessage: "안녕" });
    await truncateRoute(
      getRequest(`${ORIGIN}/api/rooms/${roomId}/messages?fromSeq=2`, owner.cookie),
      { params: Promise.resolve({ id: roomId }) },
    );

    const { res } = await chat(owner, { roomId, provider: { kind: "mock" } });
    expect(res.headers.get(USER_SEQ_HEADER)).toBeNull();

    const rows = await messagesOf(roomId);
    expect(rows.map((r) => r.role)).toEqual(["assistant", "user", "assistant"]);
    expect(await t.db.select().from(usageEvents)).toHaveLength(2);
  });

  it("스트리밍 도중 끊기면 받은 데까지 interrupted로 저장한다", async () => {
    const roomId = await open(owner);
    const res = await chatRoute(
      chatRequest(owner, { roomId, provider: { kind: "mock" }, userMessage: "중단 테스트" }),
    );

    // 첫 청크만 읽고 스트림을 취소한다 — 사용자가 중단 버튼을 누른 상황
    const reader = res.body!.getReader();
    const first = await reader.read();
    expect(first.done).toBe(false);
    await reader.cancel("사용자 중단");

    await waitFor(async () => {
      const rows = await t.db.select().from(messages).where(eq(messages.roomId, roomId));
      return rows.length === 3;
    });

    const rows = await messagesOf(roomId);
    const assistant = rows[2]!;
    expect(assistant.interrupted).toBe(true);
    expect(assistant.content.length).toBeGreaterThan(0);
    // 전체 응답보다 짧다 — 중간에 끊겼다는 뜻
    expect(assistant.content.length).toBeLessThan(200);
    expect(await t.db.select().from(usageEvents)).toHaveLength(1);
  });

  it("스트림 종료 직후 초기화해도 지운 대화가 되살아나지 않는다", async () => {
    const roomId = await open(owner);
    const res = await chatRoute(
      chatRequest(owner, { roomId, provider: { kind: "mock" }, userMessage: "경합 테스트" }),
    );
    // 스트림을 끝까지 읽자마자(=저장과 경합하는 시점) 초기화한다.
    // 저장이 먼저 끝나면 초기화가 그 행을 지우고, 초기화가 먼저면 expectedSeq 가드가 저장을 막는다.
    await res.text();
    await resetRoute(getRequest(`${ORIGIN}/api/rooms/${roomId}/reset`, owner.cookie), {
      params: Promise.resolve({ id: roomId }),
    });

    await new Promise((r) => setTimeout(r, 500));
    expect(await seqsOf(roomId)).toEqual([0]);
  });

  it("권한 — 비로그인 401, 남의 방 404, 제재 403", async () => {
    const roomId = await open(owner);

    const anonymous = await chatRoute(
      jsonRequest(`${ORIGIN}/api/chat`, { roomId, provider: { kind: "mock" } }) as NextRequest,
    );
    expect(anonymous.status).toBe(401);

    const other = await chatRoute(chatRequest(stranger, { roomId, provider: { kind: "mock" } }));
    expect(other.status).toBe(404);

    await t.db.update(users).set({ status: "suspended" }).where(eq(users.id, owner.id));
    const suspended = await chatRoute(chatRequest(owner, { roomId, provider: { kind: "mock" } }));
    expect(suspended.status).toBe(403);
  });

  it("roomId나 provider가 빠지면 400", async () => {
    const roomId = await open(owner);
    expect((await chatRoute(chatRequest(owner, { provider: { kind: "mock" } }))).status).toBe(400);
    expect((await chatRoute(chatRequest(owner, { roomId }))).status).toBe(400);
  });
});

/** 저장이 응답 스트림 종료 뒤에 일어나므로 짧게 폴링한다 */
async function waitFor(check: () => Promise<boolean>, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await check()) return;
    if (Date.now() > deadline) throw new Error("조건이 시간 안에 만족되지 않았습니다.");
    await new Promise((r) => setTimeout(r, 50));
  }
}
