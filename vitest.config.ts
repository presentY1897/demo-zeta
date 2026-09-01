import { defineConfig } from "vitest/config";

/**
 * 워크스페이스 전체 테스트. 각 패키지가 자기 vitest.config.ts를 가지면 자동으로 편입된다.
 *   pnpm test         전체
 *   pnpm test --project db   특정 패키지만
 */
export default defineConfig({
  test: {
    projects: ["packages/*/vitest.config.ts", "apps/*/vitest.config.ts"],
  },
});
