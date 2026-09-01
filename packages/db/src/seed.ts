import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import {
  dailyMetrics as mockDailyMetrics,
  demoAccounts,
  experiments as mockExperiments,
  notices as mockNotices,
  plots as mockPlots,
  users as mockUsers,
} from "@theta/mocks";
import { createPool } from "./client";
import { loadRootEnv } from "./env";
import { stableUuid } from "./stable-uuid";
import type { Database } from "./client";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import path from "node:path";

/** 데모/공식 계정 공통 비밀번호 — README와 로그인 화면에 공개된다 */
export const DEMO_PASSWORD = "theta-demo";
/** 시드 유저 800명의 password_hash — bcrypt 형식이 아니라 어떤 비밀번호와도 매칭되지 않는다 */
export const UNUSABLE_PASSWORD_HASH = "!seed";

export const OFFICIAL_NICKNAME = "세타공식";
export const OFFICIAL_EMAIL = "official@theta.demo";

const officialId = stableUuid("user:official");

function demoEmail(id: string): string {
  return `${id}@theta.demo`;
}

/** ISO 날짜 문자열(YYYY-MM-DD)을 KST 자정 기준 시각으로 */
function atKstMidnight(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00+09:00`);
}

/**
 * 전체 시드. **idempotent** — FK 역순 truncate 후 삽입하므로 몇 번을 돌려도 같은 상태가 된다.
 * (시드 이후 쌓인 실가입·실대화도 함께 지워지므로 로컬 초기화 용도로만 쓴다)
 */
export async function seed(db: Database): Promise<void> {
  await db.execute(sql`
    truncate table
      ${schema.usageEvents}, ${schema.messages}, ${schema.chatRooms},
      ${schema.sessions}, ${schema.plots}, ${schema.images}, ${schema.users},
      ${schema.dailyMetrics}, ${schema.notices}, ${schema.experiments}
    restart identity cascade
  `);

  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1) 공식 계정 — 큐레이션 플롯 12개의 소유자
  await db.insert(schema.users).values({
    id: officialId,
    email: OFFICIAL_EMAIL,
    passwordHash: demoHash,
    nickname: OFFICIAL_NICKNAME,
    plan: "pass",
    hue: 265,
    country: "KR",
    isSeed: true,
    joinedAt: atKstMidnight("2026-01-02"),
    lastActiveAt: atKstMidnight("2026-08-31"),
  });

  // 2) 큐레이션 플롯 12개 — 기존 문자열 id를 유지해 URL이 그대로 살아 있다
  await db.insert(schema.plots).values(
    mockPlots.map((p) => ({
      id: p.id,
      ownerId: officialId,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      persona: p.persona,
      firstMessage: p.firstMessage,
      tags: p.tags,
      emoji: p.emoji,
      gradientFrom: p.gradient[0],
      gradientTo: p.gradient[1],
      visibility: "public" as const,
      chatsCount: p.chats,
      likesCount: p.likes,
      createdAt: atKstMidnight(p.createdAt),
    })),
  );

  // 3) 시드 유저 800명 — 오피스 지표 표시용. bcrypt를 800번 돌리지 않는다(로그인 불가가 스펙)
  const seedUserRows = mockUsers.map((u) => ({
    id: stableUuid(`user:${u.id}`),
    email: `${u.id}@seed.theta.demo`,
    passwordHash: UNUSABLE_PASSWORD_HASH,
    nickname: u.nickname,
    plan: u.plan,
    hue: u.hue,
    status: u.status,
    country: u.country,
    isSeed: true,
    seedTurns: u.totalTurns,
    seedTokensByModel: u.tokensByModel as Record<string, number>,
    favoritePlotIds: u.favoritePlotIds,
    joinedAt: atKstMidnight(u.joinedAt),
    lastActiveAt: atKstMidnight(u.lastActiveAt),
  }));
  // 닉네임 중복은 시드 생성기 특성상 발생할 수 있어 뒤에 순번을 붙여 유니크를 보장한다
  const seenNicknames = new Set<string>([OFFICIAL_NICKNAME, ...demoAccounts.map((d) => d.nickname)]);
  for (const row of seedUserRows) {
    let nickname = row.nickname;
    let n = 2;
    while (seenNicknames.has(nickname)) nickname = `${row.nickname}_${n++}`;
    seenNicknames.add(nickname);
    row.nickname = nickname;
  }
  await insertInChunks(db, schema.users, seedUserRows, 200);

  // 4) 데모 계정 3종 — 문서화된 비밀번호로 실제 로그인이 된다
  await db.insert(schema.users).values(
    demoAccounts.map((d) => ({
      id: stableUuid(`user:${d.id}`),
      email: demoEmail(d.id),
      passwordHash: demoHash,
      nickname: d.nickname,
      plan: d.plan,
      hue: d.hue,
      country: "KR" as const,
      isSeed: true,
      joinedAt: atKstMidnight("2026-08-31"),
      lastActiveAt: atKstMidnight("2026-08-31"),
    })),
  );

  // 5) 90일 지표
  await db.insert(schema.dailyMetrics).values(
    mockDailyMetrics.map((m) => ({
      date: m.date,
      dau: m.dau,
      newUsers: m.newUsers,
      turns: m.turns,
      tokens: m.tokens,
      gpuCostKrw: m.gpuCostKrw,
      revenueKrw: m.revenueKrw,
      feeKrw: m.feeKrw,
    })),
  );

  // 6) 공지 5건 — uuid PK지만 시드는 이름 기반 고정 uuid라 재실행에도 id가 같다
  await db.insert(schema.notices).values(
    mockNotices.map((n) => ({
      id: stableUuid(`notice:${n.id}`),
      category: n.category,
      title: n.title,
      body: n.body,
      pinned: n.pinned ?? false,
      publishedAt: atKstMidnight(n.date),
    })),
  );

  // 7) 실험 3건 — 오피스에서 읽기 전용
  await db.insert(schema.experiments).values(
    mockExperiments.map((e) => ({
      id: e.id,
      name: e.name,
      hypothesis: e.hypothesis,
      status: e.status,
      startedAt: e.startedAt,
      endedAt: e.endedAt ?? null,
      variants: e.variants,
      conclusion: e.conclusion ?? null,
    })),
  );
}

/** 800행을 한 번에 보내면 파라미터 상한에 걸리므로 나눠 넣는다 */
async function insertInChunks<T extends Record<string, unknown>>(
  db: Database,
  table: Parameters<Database["insert"]>[0],
  rows: T[],
  size: number,
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.insert(table).values(rows.slice(i, i + size) as any);
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${path.resolve(process.argv[1])}`;

if (isDirectRun) {
  loadRootEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL이 없습니다. 루트의 .env.example을 .env로 복사하세요.");
    process.exit(1);
  }
  const pool = createPool(url);
  const db = drizzle(pool, { schema });
  await seed(db);
  const counts = await db.execute<{ table: string; n: number }>(sql`
    select 'plots' as table, count(*)::int as n from plots
    union all select 'users', count(*)::int from users
    union all select 'notices', count(*)::int from notices
    union all select 'daily_metrics', count(*)::int from daily_metrics
    union all select 'experiments', count(*)::int from experiments
  `);
  console.log("✓ 시드 완료");
  for (const row of counts.rows) console.log(`  ${row.table.padEnd(14)} ${row.n}`);
  await pool.end();
}
