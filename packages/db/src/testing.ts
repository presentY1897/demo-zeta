import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import type { Pool } from "pg";
import { createPool, type Database } from "./client";
import { loadRootEnv } from "./env";
import { runMigrations } from "./migrate";
import * as schema from "./schema";

loadRootEnv();

/**
 * 통합 테스트용 DB 접속. 개발용 DB(theta)가 아니라 TEST_DATABASE_URL을 쓴다 —
 * 테스트가 테이블을 truncate하기 때문에 반드시 분리돼야 한다.
 *
 * **vitest 프로젝트마다 다른 데이터베이스를 쓴다.** 프로젝트들은 서로 병렬로 도는데,
 * 한 DB를 같이 쓰면 서로의 테이블을 비우고 서로가 넣은 행을 읽는다(지표 집계처럼 전역을
 * 훑는 쿼리에서 특히 티가 난다). 각 프로젝트의 vitest 설정이 `THETA_TEST_DB`로 이름을 정한다.
 */
export function testDatabaseUrl(): string {
  const base = process.env.TEST_DATABASE_URL;
  if (!base) {
    throw new Error(
      "TEST_DATABASE_URL이 없습니다. `docker compose up -d` 후 .env.example을 .env로 복사하세요.",
    );
  }
  const name = process.env.THETA_TEST_DB;
  if (!name) return base;

  const url = new URL(base);
  url.pathname = `/${name}`;
  return url.toString();
}

/** 프로젝트별 DB는 처음 쓸 때 만든다 — 로컬 docker든 CI든 준비 절차가 따로 필요 없다 */
async function ensureDatabaseExists(url: string): Promise<void> {
  const target = new URL(url);
  const name = decodeURIComponent(target.pathname.slice(1));

  const maintenance = new URL(url);
  maintenance.pathname = "/postgres";
  const pool = createPool(maintenance.toString());
  try {
    const existing = await pool.query("select 1 from pg_database where datname = $1", [name]);
    if (existing.rowCount === 0) {
      // 식별자는 바인딩할 수 없어 큰따옴표로 감싼다(이름은 설정 파일이 정하는 고정값)
      await pool.query(`create database "${name.replace(/"/g, '""')}"`);
    }
  } catch (e) {
    // 42P04 = duplicate_database — 다른 프로세스가 먼저 만들었으면 그대로 쓴다
    if ((e as { code?: string }).code !== "42P04") throw e;
  } finally {
    await pool.end();
  }
}

let migrated: Promise<void> | null = null;

/** 테스트 DB를 만들고 마이그레이션까지 보장한다(프로세스당 1회) */
export function ensureMigrated(): Promise<void> {
  migrated ??= (async () => {
    const url = testDatabaseUrl();
    await ensureDatabaseExists(url);
    await runMigrations(url);
  })();
  return migrated;
}

export interface TestDb {
  db: Database;
  pool: Pool;
  /** 모든 테이블을 비운다 — 각 테스트 훅에서 호출 */
  reset(): Promise<void>;
  close(): Promise<void>;
}

const ALL_TABLES = [
  "usage_events",
  "messages",
  "chat_rooms",
  "sessions",
  "plots",
  "images",
  "users",
  "daily_metrics",
  "notices",
  "experiments",
] as const;

export async function createTestDb(): Promise<TestDb> {
  await ensureMigrated();
  const pool = createPool(testDatabaseUrl());
  const db = drizzle(pool, { schema });
  return {
    db,
    pool,
    async reset() {
      await db.execute(
        sql.raw(`truncate table ${ALL_TABLES.join(", ")} restart identity cascade`),
      );
    },
    async close() {
      await pool.end();
    },
  };
}
