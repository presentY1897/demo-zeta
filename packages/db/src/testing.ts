import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import type { Pool } from "pg";
import { createPool, type Database } from "./client";
import { loadRootEnv } from "./env";
import { runMigrations } from "./migrate";
import * as schema from "./schema";

loadRootEnv();

/**
 * 통합 테스트용 DB 접속. 개발용 DB(theta)가 아니라 TEST_DATABASE_URL(theta_test)을 쓴다 —
 * 테스트가 테이블을 truncate하기 때문에 반드시 분리돼야 한다.
 */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL이 없습니다. `docker compose up -d` 후 .env.example을 .env로 복사하세요.",
    );
  }
  return url;
}

let migrated: Promise<void> | null = null;

/** 테스트 DB에 마이그레이션을 보장한다(프로세스당 1회) */
export function ensureMigrated(): Promise<void> {
  migrated ??= runMigrations(testDatabaseUrl());
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
