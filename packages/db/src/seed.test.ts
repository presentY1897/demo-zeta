import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "./testing";
import { DEMO_PASSWORD, OFFICIAL_NICKNAME, seed } from "./seed";
import * as schema from "./schema";

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
  await seed(t.db);
}, 120_000);

afterAll(async () => {
  await t?.close();
});

async function count(table: string): Promise<number> {
  const r = await t.db.execute<{ n: number }>(sql.raw(`select count(*)::int as n from ${table}`));
  return r.rows[0]?.n ?? 0;
}

/** password_hash를 제외한 논리 상태 — bcrypt salt는 실행마다 달라지므로 비교에서 뺀다 */
async function logicalSnapshot(): Promise<string> {
  const r = await t.db.execute<{ h: string }>(sql`
    select md5(string_agg(x, '|' order by x)) as h from (
      select (id::text || email || nickname || plan || status || country ||
              is_seed || seed_turns || joined_at) as x from users
      union all select id || name || visibility || chats_count || array_to_string(tags, ',') from plots
      union all select id::text || title || pinned || published_at from notices
      union all select date::text || dau || turns from daily_metrics
      union all select id || name || status from experiments
    ) s
  `);
  return r.rows[0]?.h ?? "";
}

describe("시드", () => {
  it("설계에 명시된 규모로 들어간다", async () => {
    expect(await count("plots")).toBe(12);
    // 시드 800 + 데모 3 + 공식 1
    expect(await count("users")).toBe(804);
    expect(await count("notices")).toBe(5);
    expect(await count("daily_metrics")).toBe(90);
    expect(await count("experiments")).toBe(3);
  });

  it("두 번 실행해도 상태가 같다(idempotent)", async () => {
    const before = await logicalSnapshot();
    await seed(t.db);
    expect(await logicalSnapshot()).toBe(before);
    expect(await count("users")).toBe(804);
  });

  it("큐레이션 플롯 12개는 공식 계정 소유의 공개 플롯이고, 기존 문자열 id를 유지한다", async () => {
    const official = await t.db.query.users.findFirst({
      where: eq(schema.users.nickname, OFFICIAL_NICKNAME),
    });
    expect(official).toBeDefined();

    const owned = await t.db
      .select()
      .from(schema.plots)
      .where(and(eq(schema.plots.ownerId, official!.id), eq(schema.plots.visibility, "public")));
    expect(owned).toHaveLength(12);
    expect(owned.map((p) => p.id)).toContain("seojun-contract");
    // gradient 튜플이 2컬럼으로 분해돼 들어갔다
    const seojun = owned.find((p) => p.id === "seojun-contract")!;
    expect(seojun.gradientFrom).toMatch(/^#/);
    expect(seojun.gradientTo).toMatch(/^#/);
    expect(seojun.tags.length).toBeGreaterThan(0);
  });

  it("데모 계정 3종은 문서화된 비밀번호로 로그인 가능하다", async () => {
    const demo = await t.db.query.users.findFirst({
      where: eq(schema.users.email, "demo-heavy@theta.demo"),
    });
    expect(demo).toBeDefined();
    expect(await bcrypt.compare(DEMO_PASSWORD, demo!.passwordHash!)).toBe(true);
  });

  it("시드 유저 800명의 password_hash는 bcrypt 형식이 아니다 — 로그인이 원천 차단된다", async () => {
    const seeded = await t.db
      .select({ hash: schema.users.passwordHash })
      .from(schema.users)
      .where(sql`${schema.users.email} like '%@seed.theta.demo'`);
    expect(seeded).toHaveLength(800);
    for (const { hash } of seeded) {
      expect(hash).not.toMatch(/^\$2[aby]\$/);
    }
    // 실제로 어떤 비밀번호로도 검증되지 않는다
    expect(await bcrypt.compare("theta-demo", seeded[0]!.hash!).catch(() => false)).toBe(false);
  });
});

/**
 * drizzle는 드라이버 에러를 "Failed query: ..." 로 감싸므로 메시지가 아니라
 * 원인의 SQLSTATE(23505 = unique_violation)로 판정한다.
 */
async function expectUniqueViolation(run: () => Promise<unknown>): Promise<void> {
  let code: string | undefined;
  try {
    await run();
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    code = err.cause?.code ?? err.code;
  }
  expect(code, "유니크 제약 위반(23505)이 발생해야 한다").toBe("23505");
}

describe("제약", () => {
  it("이메일은 대소문자 무시하고 유일하다", async () => {
    await expectUniqueViolation(() =>
      t.db.insert(schema.users).values({
        email: "DEMO-NEW@Theta.Demo",
        nickname: "중복이메일테스트",
      }),
    );
  });

  it("닉네임은 유일하다", async () => {
    await expectUniqueViolation(() =>
      t.db.insert(schema.users).values({
        email: "nickname-dup@example.com",
        nickname: OFFICIAL_NICKNAME,
      }),
    );
  });

  it("한 유저는 한 플롯에 방을 하나만 갖는다", async () => {
    const user = await t.db.query.users.findFirst({
      where: eq(schema.users.email, "demo-new@theta.demo"),
    });
    const values = { userId: user!.id, plotId: "seojun-contract" };
    await t.db.insert(schema.chatRooms).values(values);
    await expectUniqueViolation(() => t.db.insert(schema.chatRooms).values(values));
  });
});

describe("cascade", () => {
  it("플롯을 지우면 그 방과 메시지가 함께 사라진다", async () => {
    const user = await t.db.query.users.findFirst({
      where: eq(schema.users.email, "demo-creator@theta.demo"),
    });
    const [plot] = await t.db
      .insert(schema.plots)
      .values({
        id: "cascade-test",
        ownerId: user!.id,
        name: "테스트 플롯",
        tagline: "t",
        description: "d",
        persona: "p",
        firstMessage: "f",
        emoji: "🧪",
        gradientFrom: "#000",
        gradientTo: "#fff",
      })
      .returning();
    const [room] = await t.db
      .insert(schema.chatRooms)
      .values({ userId: user!.id, plotId: plot!.id })
      .returning();
    await t.db
      .insert(schema.messages)
      .values([
        { roomId: room!.id, seq: 0, role: "assistant", content: "f" },
        { roomId: room!.id, seq: 1, role: "user", content: "안녕" },
      ]);

    await t.db.delete(schema.plots).where(eq(schema.plots.id, "cascade-test"));

    const rooms = await t.db
      .select()
      .from(schema.chatRooms)
      .where(eq(schema.chatRooms.id, room!.id));
    const msgs = await t.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.roomId, room!.id));
    expect(rooms).toHaveLength(0);
    expect(msgs).toHaveLength(0);
  });

  it("유저를 지우면 세션이 함께 사라진다", async () => {
    const [user] = await t.db
      .insert(schema.users)
      .values({ email: "cascade@example.com", nickname: "캐스케이드테스트" })
      .returning();
    await t.db.insert(schema.sessions).values({
      token: "cascade-token",
      userId: user!.id,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await t.db.delete(schema.users).where(eq(schema.users.id, user!.id));

    const left = await t.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.token, "cascade-token"));
    expect(left).toHaveLength(0);
  });
});
