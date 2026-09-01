import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { chatRooms, messages, plots, users, type Database } from "@theta/db";
import { createTestDb, type TestDb } from "@theta/db/testing";
import { GET as listRoute, POST as createRoute } from "@/app/api/plots/route";
import { DELETE as deleteRoute, GET as getRoute } from "@/app/api/plots/[id]/route";
import { issueSession, SESSION_COOKIE } from "@/server/auth/session";
import { getRequest, jsonRequest } from "@/server/auth/testing";
import type { PlotView } from "@/lib/plot-view";

const ORIGIN = "http://localhost:3000";

let t: TestDb;
let owner: { id: string; cookie: Record<string, string> };
let stranger: { id: string; cookie: Record<string, string> };

const validDraft = {
  name: "테스트 캐릭터",
  tagline: "한 줄 소개",
  description: "세계관 소개",
  persona: "성격과 말투",
  firstMessage: "*문을 연다* 안녕.",
  tags: ["로맨스", "테스트"],
  emoji: "🌙",
  gradient: ["#2b2d5e", "#7a68f5"],
  visibility: "public" as const,
};

async function makeUser(db: Database, nickname: string) {
  const [user] = await db
    .insert(users)
    .values({ email: `${nickname}@example.com`, nickname })
    .returning();
  const session = await issueSession(db, user!.id);
  return { id: user!.id, cookie: { [SESSION_COOKIE]: session.token } };
}

async function insertPlot(
  ownerId: string,
  overrides: Partial<typeof plots.$inferInsert> = {},
): Promise<string> {
  const id = overrides.id ?? `plot-${Math.random().toString(36).slice(2, 10)}`;
  await t.db.insert(plots).values({
    id,
    ownerId,
    name: "플롯",
    tagline: "소개",
    description: "설명",
    persona: "비공개 페르소나",
    firstMessage: "첫 메시지",
    tags: ["로맨스"],
    emoji: "🌙",
    gradientFrom: "#000000",
    gradientTo: "#ffffff",
    ...overrides,
  });
  return id;
}

async function listAs(cookie?: Record<string, string>, query = ""): Promise<PlotView[]> {
  const res = await listRoute(getRequest(`${ORIGIN}/api/plots${query}`, cookie));
  const body = (await res.json()) as { plots: PlotView[] };
  return body.plots;
}

function getAs(id: string, cookie?: Record<string, string>) {
  return getRoute(getRequest(`${ORIGIN}/api/plots/${id}`, cookie), {
    params: Promise.resolve({ id }),
  });
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
});

describe("가시성 매트릭스", () => {
  it("공개 플롯은 소유자·타인·비로그인 모두에게 목록과 단건 조회로 보인다", async () => {
    const id = await insertPlot(owner.id, { visibility: "public" });

    for (const [label, cookie] of [
      ["소유자", owner.cookie],
      ["타인", stranger.cookie],
      ["비로그인", undefined],
    ] as const) {
      expect((await listAs(cookie)).map((p) => p.id), label).toContain(id);
      expect((await getAs(id, cookie)).status, label).toBe(200);
    }
  });

  it("비공개 플롯은 소유자에게만 보이고, 타인·비로그인에게는 404 — 존재 여부가 드러나지 않는다", async () => {
    const id = await insertPlot(owner.id, { visibility: "private" });

    expect((await listAs(owner.cookie)).map((p) => p.id)).toContain(id);
    expect((await getAs(id, owner.cookie)).status).toBe(200);

    for (const [label, cookie] of [
      ["타인", stranger.cookie],
      ["비로그인", undefined],
    ] as const) {
      expect((await listAs(cookie)).map((p) => p.id), label).not.toContain(id);
      const res = await getAs(id, cookie);
      expect(res.status, label).toBe(404);
      // 없는 id와 완전히 같은 응답
      const missing = await getAs("존재하지-않는-id", cookie);
      expect(await res.json()).toEqual(await missing.json());
    }
  });

  it("비공개 페르소나는 어떤 조회 경로에도 실리지 않는다", async () => {
    const id = await insertPlot(owner.id, { persona: "절대 노출되면 안 되는 설정" });

    const single = await (await getAs(id, owner.cookie)).text();
    const list = JSON.stringify(await listAs(owner.cookie));
    expect(single).not.toContain("절대 노출되면 안 되는 설정");
    expect(list).not.toContain("절대 노출되면 안 되는 설정");
  });
});

describe("플롯 생성", () => {
  it("로그인해야 만들 수 있다", async () => {
    const res = await createRoute(jsonRequest(`${ORIGIN}/api/plots`, validDraft));
    expect(res.status).toBe(401);
    expect(await t.db.select().from(plots)).toHaveLength(0);
  });

  it("제재된 계정은 403", async () => {
    await t.db.update(users).set({ status: "suspended" }).where(eq(users.id, owner.id));
    const res = await createRoute(
      jsonRequest(`${ORIGIN}/api/plots`, validDraft, { cookies: owner.cookie }),
    );
    expect(res.status).toBe(403);
  });

  it("비공개 선택이 실제로 저장된다 — 기존 갭 ① 해소", async () => {
    const res = await createRoute(
      jsonRequest(
        `${ORIGIN}/api/plots`,
        { ...validDraft, visibility: "private" },
        { cookies: owner.cookie },
      ),
    );
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: string };

    const [row] = await t.db.select().from(plots).where(eq(plots.id, id));
    expect(row!.visibility).toBe("private");
    expect(row!.ownerId).toBe(owner.id);
    // 타인 홈에는 나오지 않는다
    expect((await listAs(stranger.cookie)).map((p) => p.id)).not.toContain(id);
  });

  it("필드 제한을 넘기면 400이고 아무것도 저장되지 않는다", async () => {
    const cases: [string, Record<string, unknown>][] = [
      ["이름 20자 초과", { name: "가".repeat(21) }],
      ["한 줄 소개 40자 초과", { tagline: "가".repeat(41) }],
      ["세계관 300자 초과", { description: "가".repeat(301) }],
      ["페르소나 500자 초과", { persona: "가".repeat(501) }],
      ["첫 메시지 500자 초과", { firstMessage: "가".repeat(501) }],
      ["태그 없음", { tags: [] }],
      ["태그 5개", { tags: ["a", "b", "c", "d", "e"] }],
      ["이름 빈 값", { name: "   " }],
      ["색상 형식 오류", { gradient: ["red", "blue"] }],
      ["공개 설정 없음", { visibility: "somewhere" }],
    ];
    for (const [label, patch] of cases) {
      const res = await createRoute(
        jsonRequest(`${ORIGIN}/api/plots`, { ...validDraft, ...patch }, { cookies: owner.cookie }),
      );
      expect(res.status, label).toBe(400);
    }
    expect(await t.db.select().from(plots)).toHaveLength(0);
  });

  it("생성된 플롯은 소유자 닉네임을 크리에이터로 보여준다", async () => {
    const res = await createRoute(
      jsonRequest(`${ORIGIN}/api/plots`, validDraft, { cookies: owner.cookie }),
    );
    const { id } = (await res.json()) as { id: string };
    const body = (await (await getAs(id, owner.cookie)).json()) as { plot: PlotView };
    expect(body.plot.creator).toBe("주인");
    expect(body.plot.mine).toBe(true);
    expect(body.plot.chats).toBe(0);
  });
});

describe("플롯 삭제", () => {
  it("타인은 삭제할 수 없다", async () => {
    const id = await insertPlot(owner.id);
    const res = await deleteRoute(getRequest(`${ORIGIN}/api/plots/${id}`, stranger.cookie), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(403);
    expect(await t.db.select().from(plots).where(eq(plots.id, id))).toHaveLength(1);
  });

  it("소유자가 지우면 대화방·메시지도 함께 사라진다", async () => {
    const id = await insertPlot(owner.id);
    const [room] = await t.db
      .insert(chatRooms)
      .values({ userId: owner.id, plotId: id })
      .returning();
    await t.db
      .insert(messages)
      .values({ roomId: room!.id, seq: 0, role: "assistant", content: "첫 메시지" });

    const res = await deleteRoute(getRequest(`${ORIGIN}/api/plots/${id}`, owner.cookie), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(await t.db.select().from(plots).where(eq(plots.id, id))).toHaveLength(0);
    expect(await t.db.select().from(chatRooms).where(eq(chatRooms.id, room!.id))).toHaveLength(0);
    expect(await t.db.select().from(messages).where(eq(messages.roomId, room!.id))).toHaveLength(0);
  });
});

describe("목록 필터와 정렬", () => {
  it("태그가 일치하는 플롯만 돌려준다", async () => {
    const romance = await insertPlot(owner.id, { tags: ["로맨스", "학원"] });
    const fantasy = await insertPlot(owner.id, { tags: ["판타지"] });

    const filtered = (await listAs(undefined, "?tag=로맨스")).map((p) => p.id);
    expect(filtered).toContain(romance);
    expect(filtered).not.toContain(fantasy);
    expect(await listAs(undefined, "?tag=없는태그")).toHaveLength(0);
  });

  it("내 플롯이 앞에 오고, 나머지는 대화수 내림차순이다", async () => {
    const popular = await insertPlot(stranger.id, { chatsCount: 5000 });
    const quiet = await insertPlot(stranger.id, { chatsCount: 10 });
    const mine = await insertPlot(owner.id, { chatsCount: 0 });

    expect((await listAs(owner.cookie)).map((p) => p.id)).toEqual([mine, popular, quiet]);
    // 비로그인에게는 "내 플롯" 개념이 없으니 인기순만 남는다
    expect((await listAs()).map((p) => p.id)).toEqual([popular, quiet, mine]);
  });
});
