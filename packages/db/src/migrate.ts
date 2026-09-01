import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPool } from "./client";
import { loadRootEnv } from "./env";

loadRootEnv();

export const MIGRATIONS_FOLDER = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "drizzle",
);

/** 주어진 커넥션에 마이그레이션을 적용한다(테스트 헬퍼도 이 함수를 쓴다) */
export async function runMigrations(connectionString: string): Promise<void> {
  const pool = createPool(connectionString);
  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${path.resolve(process.argv[1])}`;

if (isDirectRun) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL이 없습니다. 루트의 .env.example을 .env로 복사하세요.");
    process.exit(1);
  }
  await runMigrations(url);
  console.log("✓ 마이그레이션 완료");
}
