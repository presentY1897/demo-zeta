import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

/**
 * 로컬 docker와 Neon(풀드 커넥션 스트링) 모두 표준 Postgres 프로토콜이라
 * 드라이버는 node-postgres 하나로 통일한다 — 환경별 코드 분기가 없다.
 */
export function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: 5,
    // Neon 등 관리형 Postgres는 TLS를 요구하되 체인 검증까지는 하지 않는다
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });
}

function needsSsl(connectionString: string): boolean {
  if (/sslmode=disable/.test(connectionString)) return false;
  if (/sslmode=require/.test(connectionString)) return true;
  return !/@(localhost|127\.0\.0\.1|db)[:/]/.test(connectionString);
}

export function createDb(connectionString: string): Database {
  return drizzle(createPool(connectionString), { schema });
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL이 설정되지 않았습니다. 루트의 .env.example을 .env로 복사하세요 " +
        "(로컬 DB는 `docker compose up -d` 후 `pnpm db:migrate && pnpm db:seed`).",
    );
  }
  return url;
}

/**
 * 앱에서 쓰는 싱글턴. **지연 생성** — 모듈을 import하는 것만으로 커넥션이 열리거나
 * DATABASE_URL 부재로 터지지 않는다(빌드 타임 수집·마이그레이션 스크립트가 이 모듈을 거친다).
 * dev 서버의 핫 리로드가 모듈을 다시 평가해도 풀이 누적되지 않도록 globalThis에 보관한다.
 */
const globalForDb = globalThis as unknown as { __thetaDb?: Database };

function getDb(): Database {
  globalForDb.__thetaDb ??= createDb(requireDatabaseUrl());
  return globalForDb.__thetaDb;
}

export const db: Database = new Proxy({} as Database, {
  get: (_t, prop, receiver) => Reflect.get(getDb(), prop, receiver),
  has: (_t, prop) => Reflect.has(getDb(), prop),
});
