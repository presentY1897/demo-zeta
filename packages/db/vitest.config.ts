import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "db",
    environment: "node",
    // 프로젝트끼리 병렬로 도므로 각자 다른 데이터베이스를 쓴다
    env: { THETA_TEST_DB: "theta_test_db" },
    include: ["src/**/*.test.ts"],
    // 통합 테스트는 같은 DB를 truncate하므로 파일 간 경합을 막기 위해 직렬 실행한다
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
