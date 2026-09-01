import { loadRootEnv } from "@theta/db/env";

loadRootEnv(process.cwd());

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL이 없습니다. `docker compose up -d` 후 .env.example을 .env로 복사하세요.",
  );
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
// 개발자의 .env 값과 무관하게 테스트가 재현되도록 고정값으로 덮어쓴다
process.env.SESSION_SECRET = "test-session-secret";
process.env.ADMIN_PASSWORD = "test-admin-password";
