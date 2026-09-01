import { runMigrations } from "@theta/db/migrate";
import { createDb } from "@theta/db";
import { seed } from "@theta/db/seed";
import { E2E_DATABASE_URL } from "../playwright.config";

/** E2E는 전용 DB(theta_e2e)를 매 실행마다 마이그레이션 + 시드로 되돌린 상태에서 시작한다 */
export default async function globalSetup(): Promise<void> {
  await runMigrations(E2E_DATABASE_URL);
  const db = createDb(E2E_DATABASE_URL);
  await seed(db);
}
