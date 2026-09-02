import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    name: "web",
    environment: "node",
    // 프로젝트끼리 병렬로 도므로 각자 다른 데이터베이스를 쓴다
    env: { THETA_TEST_DB: "theta_test_web" },
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // 통합 테스트가 같은 DB를 truncate하므로 직렬 실행
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
