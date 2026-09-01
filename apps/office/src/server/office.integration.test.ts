import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { chatRooms, plots, sessions, usageEvents, users, type Database } from "@theta/db";
import { createTestDb, type TestDb } from "@theta/db/testing";
import { POST as sanctionRoute } from "@/app/api/admin/users/[id]/sanction/route";
import { ADMIN_COOKIE, issueAdminToken } from "@/server/admin-auth";
import { getUserDetail, listUsers, parseUserQuery, PAGE_SIZE } from "@/server/users";
import { loadMetricSeries } from "@/server/metrics";

let t: TestDb;

const ORIGIN = "http://localhost:3001";

function adminRequest(url: string, body: unknown): Request {
  const { token } = issueAdminToken();
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `${ADMIN_COOKIE}=${encodeURIComponent(token)}`,
    },
    body: JSON.stringify(body),
  });
}

function anonymousRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function makeUser(
  db: Database,
  overrides: Partial<typeof users.$inferInsert> & { nickname: string },
): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({ email: `${overrides.nickname}@example.com`, ...overrides })
    .returning({ id: users.id });
  return row!.id;
}

const query = (params: Record<string, string> = {}) => parseUserQuery(params);

beforeAll(async () => {
  t = await createTestDb();
}, 120_000);

afterAll(async () => {
  await t?.close();
});

beforeEach(async () => {
  await t.reset();
});

describe("유저 목록 쿼리", () => {
  beforeEach(async () => {
    await makeUser(t.db, {
      nickname: "달빛토끼",
      plan: "pass",
      isSeed: true,
      seedTurns: 500,
      seedTokensByModel: { "koji-lite": 1000, koji: 2000, luca: 3000 },
      lastActiveAt: new Date("2026-08-31T00:00:00+09:00"),
    });
    await makeUser(t.db, {
      nickname: "별빛여우",
      plan: "free",
      status: "suspended",
      isSeed: true,
      seedTurns: 100,
      seedTokensByModel: { "koji-lite": 100 },
      lastActiveAt: new Date("2026-08-20T00:00:00+09:00"),
    });
    await makeUser(t.db, {
      nickname: "실가입유저",
      plan: "free",
      isSeed: false,
      lastActiveAt: new Date("2026-09-01T00:00:00+09:00"),
    });
  });

  it("시드 유저와 실가입 유저가 한 목록에 나온다", async () => {
    const { rows, total } = await listUsers(t.db, query());
    expect(total).toBe(3);
    expect(rows.map((r) => r.nickname)).toContain("실가입유저");
    expect(rows.find((r) => r.nickname === "실가입유저")!.isSeed).toBe(false);
  });

  it("검색은 닉네임과 이메일에 대소문자 무시로 걸린다", async () => {
    expect((await listUsers(t.db, query({ q: "달빛" }))).total).toBe(1);
    expect((await listUsers(t.db, query({ q: "별빛여우@EXAMPLE" }))).total).toBe(1);
    expect((await listUsers(t.db, query({ q: "없는닉네임" }))).total).toBe(0);
  });

  it("플랜·상태 필터", async () => {
    expect((await listUsers(t.db, query({ plan: "pass" }))).total).toBe(1);
    expect((await listUsers(t.db, query({ status: "suspended" }))).total).toBe(1);
    expect((await listUsers(t.db, query({ plan: "free", status: "active" }))).total).toBe(1);
  });

  it("정렬 3종 — 최근 활동·턴·토큰", async () => {
    const byActive = await listUsers(t.db, query());
    expect(byActive.rows[0]!.nickname).toBe("실가입유저");

    const byTurns = await listUsers(t.db, query({ sort: "turns" }));
    expect(byTurns.rows[0]!.nickname).toBe("달빛토끼");

    const byTokens = await listUsers(t.db, query({ sort: "tokens" }));
    expect(byTokens.rows.map((r) => r.nickname)).toEqual([
      "달빛토끼",
      "별빛여우",
      "실가입유저",
    ]);
  });

  it("턴·토큰은 시드값과 실사용을 합산한다", async () => {
    const target = (await listUsers(t.db, query({ q: "실가입유저" }))).rows[0]!;
    await t.db.insert(usageEvents).values([
      {
        userId: target.id,
        providerKind: "mock",
        model: "mock",
        estInputTokens: 100,
        estOutputTokens: 50,
      },
      {
        userId: target.id,
        providerKind: "mock",
        model: "mock",
        estInputTokens: 200,
        estOutputTokens: 80,
      },
    ]);

    const after = (await listUsers(t.db, query({ q: "실가입유저" }))).rows[0]!;
    expect(after.turns).toBe(2);
    expect(after.tokens).toBe(430);
  });

  it("페이징 — 범위 밖 페이지는 마지막 페이지로 clamp된다", async () => {
    for (let i = 0; i < PAGE_SIZE + 5; i++) {
      await makeUser(t.db, { nickname: `벌크${i}` });
    }
    const total = PAGE_SIZE + 5 + 3;

    const first = await listUsers(t.db, query());
    expect(first.rows).toHaveLength(PAGE_SIZE);
    expect(first.page).toBe(1);
    expect(first.pageCount).toBe(Math.ceil(total / PAGE_SIZE));

    const second = await listUsers(t.db, query({ page: "2" }));
    expect(second.page).toBe(2);
    expect(second.rows).toHaveLength(total - PAGE_SIZE);

    const beyond = await listUsers(t.db, query({ page: "999" }));
    expect(beyond.page).toBe(second.pageCount);
    // 이상한 값도 1페이지로 떨어진다
    expect((await listUsers(t.db, query({ page: "-3" }))).page).toBe(1);
    expect((await listUsers(t.db, query({ page: "abc" }))).page).toBe(1);
  });
});

describe("유저 상세", () => {
  it("시드 토큰과 실사용 토큰을 나눠 보여준다", async () => {
    const id = await makeUser(t.db, {
      nickname: "상세유저",
      isSeed: true,
      seedTurns: 10,
      seedTokensByModel: { koji: 1000 },
    });
    await t.db.insert(usageEvents).values({
      userId: id,
      providerKind: "openai",
      model: "gpt-4o-mini",
      estInputTokens: 30,
      estOutputTokens: 20,
    });

    const detail = await getUserDetail(t.db, id);
    expect(detail).not.toBeNull();
    expect(detail!.turns).toBe(11);
    expect(detail!.tokens).toBe(1050);
    expect(detail!.realTokens).toBe(50);
    expect(detail!.seedTokensByModel).toEqual({ koji: 1000 });
  });

  it("즐겨찾는 플롯을 이름으로 붙여 준다", async () => {
    await t.db.insert(plots).values({
      id: "fav-plot",
      name: "이서준",
      tagline: "t",
      description: "d",
      persona: "p",
      firstMessage: "f",
      emoji: "🖤",
      gradientFrom: "#000",
      gradientTo: "#fff",
    });
    const id = await makeUser(t.db, { nickname: "즐겨찾기유저", favoritePlotIds: ["fav-plot"] });

    const detail = await getUserDetail(t.db, id);
    expect(detail!.favorites).toEqual([{ id: "fav-plot", name: "이서준", emoji: "🖤" }]);
  });

  it("없는 id·uuid가 아닌 id는 null (500이 나지 않는다)", async () => {
    expect(await getUserDetail(t.db, "00000000-0000-0000-0000-000000000000")).toBeNull();
    expect(await getUserDetail(t.db, "u0001")).toBeNull();
  });
});

describe("제재", () => {
  it("제재하면 상태가 바뀌고 그 유저의 세션이 전부 끊긴다", async () => {
    const id = await makeUser(t.db, { nickname: "제재대상" });
    const other = await makeUser(t.db, { nickname: "무관한유저" });
    await t.db.insert(sessions).values([
      { token: "t1", userId: id, expiresAt: new Date(Date.now() + 60_000) },
      { token: "t2", userId: id, expiresAt: new Date(Date.now() + 60_000) },
      { token: "t3", userId: other, expiresAt: new Date(Date.now() + 60_000) },
    ]);

    const res = await sanctionRoute(
      adminRequest(`${ORIGIN}/api/admin/users/${id}/sanction`, { suspended: true }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(200);

    const [row] = await t.db.select().from(users).where(eq(users.id, id));
    expect(row!.status).toBe("suspended");
    expect(await t.db.select().from(sessions).where(eq(sessions.userId, id))).toHaveLength(0);
    // 다른 유저의 세션은 그대로
    expect(await t.db.select().from(sessions).where(eq(sessions.userId, other))).toHaveLength(1);
  });

  it("해제하면 상태가 복구된다", async () => {
    const id = await makeUser(t.db, { nickname: "해제대상", status: "suspended" });
    await sanctionRoute(
      adminRequest(`${ORIGIN}/api/admin/users/${id}/sanction`, { suspended: false }),
      { params: Promise.resolve({ id }) },
    );
    const [row] = await t.db.select().from(users).where(eq(users.id, id));
    expect(row!.status).toBe("active");
  });

  it("비인증 요청은 401이고 상태가 바뀌지 않는다", async () => {
    const id = await makeUser(t.db, { nickname: "보호대상" });
    const res = await sanctionRoute(
      anonymousRequest(`${ORIGIN}/api/admin/users/${id}/sanction`, { suspended: true }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(401);
    const [row] = await t.db.select().from(users).where(eq(users.id, id));
    expect(row!.status).toBe("active");
  });

  it("없는 유저는 404, suspended가 boolean이 아니면 400", async () => {
    const missing = await sanctionRoute(
      adminRequest(`${ORIGIN}/api/admin/users/00000000-0000-0000-0000-000000000000/sanction`, {
        suspended: true,
      }),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(missing.status).toBe(404);

    const id = await makeUser(t.db, { nickname: "형식오류대상" });
    const bad = await sanctionRoute(
      adminRequest(`${ORIGIN}/api/admin/users/${id}/sanction`, { suspended: "yes" }),
      { params: Promise.resolve({ id }) },
    );
    expect(bad.status).toBe(400);
  });
});

describe("지표 합산 쿼리", () => {
  it("usage_events를 일별로 묶고 실가입만 신규로 센다", async () => {
    const seedUser = await makeUser(t.db, {
      nickname: "시드가입",
      isSeed: true,
      joinedAt: new Date("2026-09-01T10:00:00+09:00"),
    });
    const realUser = await makeUser(t.db, {
      nickname: "실가입",
      isSeed: false,
      joinedAt: new Date("2026-09-01T10:00:00+09:00"),
    });
    await t.db.insert(plots).values({
      id: "metric-plot",
      name: "p",
      tagline: "t",
      description: "d",
      persona: "p",
      firstMessage: "f",
      emoji: "🌙",
      gradientFrom: "#000",
      gradientTo: "#fff",
    });
    await t.db.insert(chatRooms).values({ userId: realUser, plotId: "metric-plot" });

    // 같은 날 두 유저가 각각 대화 — 턴 3, DAU 2
    await t.db.insert(usageEvents).values([
      { userId: realUser, plotId: "metric-plot", providerKind: "mock", model: "mock", estInputTokens: 10, estOutputTokens: 5, createdAt: new Date("2026-09-01T12:00:00+09:00") },
      { userId: realUser, plotId: "metric-plot", providerKind: "mock", model: "mock", estInputTokens: 10, estOutputTokens: 5, createdAt: new Date("2026-09-01T13:00:00+09:00") },
      { userId: seedUser, plotId: "metric-plot", providerKind: "mock", model: "mock", estInputTokens: 20, estOutputTokens: 10, createdAt: new Date("2026-09-01T14:00:00+09:00") },
    ]);

    const series = await loadMetricSeries(t.db, new Date("2026-09-01T12:00:00+09:00"));
    const day = series.find((p) => p.date === "2026-09-01");
    expect(day).toBeDefined();
    expect(day!.turns).toBe(3);
    expect(day!.dau).toBe(2);
    expect(day!.newUsers).toBe(1); // 시드 유저의 가입은 신규로 세지 않는다
    expect(day!.realTokens).toBe(60);
    expect(day!.hasReal).toBe(true);
  });

  it("시드 지표가 있으면 그 뒤로 실사용이 이어붙는다", async () => {
    await t.db.execute(sql`
      insert into daily_metrics (date, dau, new_users, turns, tokens, gpu_cost_krw, revenue_krw, fee_krw)
      values ('2026-08-31', 400000, 20000, 20000000, '{}'::jsonb, 100, 200, 30)
    `);
    const id = await makeUser(t.db, { nickname: "이어붙임", isSeed: false });
    await t.db.insert(usageEvents).values({
      userId: id,
      providerKind: "mock",
      model: "mock",
      estInputTokens: 1,
      estOutputTokens: 1,
      createdAt: new Date("2026-09-01T12:00:00+09:00"),
    });

    const series = await loadMetricSeries(t.db, new Date("2026-09-01T12:00:00+09:00"));
    expect(series.map((p) => p.date)).toEqual(["2026-08-31", "2026-09-01"]);
    expect(series[0]!.dau).toBe(400000);
    expect(series[1]!.dau).toBe(1);
  });
});
