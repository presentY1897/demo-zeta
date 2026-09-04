import { createDb } from "@theta/db";
import { runMigrations } from "@theta/db/migrate";
import { seed } from "@theta/db/seed";
import { E2E_DATABASE_URL } from "./env";

/**
 * E2E 전용 DB를 시드 직후 상태로 되돌린다.
 *
 * **Playwright의 globalSetup이 아니라 그 앞에서 따로 돌린다** — Playwright는 webServer를
 * 먼저 띄우고 globalSetup을 실행해서, 서버가 아직 테이블이 없는 DB에 붙어 에러를 뱉었다.
 * `pnpm e2e`가 이 스크립트를 먼저 실행하므로 서버는 항상 준비된 DB를 본다.
 *
 * 배포 URL을 대상으로 돌릴 때(E2E_BASE_URL)는 아무것도 하지 않는다 — 남의 DB를 비우면 안 된다.
 */
async function main(): Promise<void> {
  if (process.env.E2E_BASE_URL) {
    console.log("· E2E_BASE_URL이 설정돼 DB 준비를 건너뜁니다(배포 대상).");
    return;
  }
  await runMigrations(E2E_DATABASE_URL);
  const db = createDb(E2E_DATABASE_URL);
  await seed(db);
  console.log("✓ E2E DB 준비 완료");
}

await main();
process.exit(0);
