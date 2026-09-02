import { loadRootEnv } from "@theta/db/env";
import { testDatabaseUrl } from "@theta/db/testing";

loadRootEnv(process.cwd());

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL이 없습니다. `docker compose up -d` 후 .env.example을 .env로 복사하세요.",
  );
}
// 라우트 핸들러는 @theta/db의 싱글턴을 쓴다 — 그 싱글턴이 이 프로젝트의 테스트 DB를 보게 한다
process.env.DATABASE_URL = testDatabaseUrl();
// 개발자의 .env 값과 무관하게 테스트가 재현되도록 고정값으로 덮어쓴다
process.env.SESSION_SECRET = "test-session-secret";
