import { defineConfig, devices } from "@playwright/test";
import {
  ADMIN_PASSWORD,
  E2E_DATABASE_URL,
  OFFICE_BASE_URL,
  OFFICE_PORT,
  SESSION_SECRET,
  WEB_BASE_URL,
  WEB_PORT,
} from "./e2e/env";

/**
 * 스모크 E2E. 기본은 로컬 서버를 자동 기동한다(DB 준비는 `pnpm e2e`가 먼저 도는
 * e2e/prepare-db.ts가 맡는다 — webServer가 준비된 DB를 보게 하려면 그 앞이어야 한다).
 * `E2E_BASE_URL`을 주면 이미 떠 있는 서버(배포 URL 포함)를 그대로 쓴다 — T7의 배포 스모크가 이 경로다.
 */
const externalWeb = process.env.E2E_BASE_URL;
const webBaseUrl = WEB_BASE_URL;
const officeBaseUrl = OFFICE_BASE_URL;

// CI에서는 dev 서버 대신 빌드 결과를 띄운다 — 라우트별 최초 컴파일 지연이 없어 훨씬 안정적이고,
// 배포본과 같은 프로덕션 빌드를 검증하게 된다(워크플로가 e2e 앞에서 build를 돌린다).
const serverMode = process.env.CI ? "start" : "dev";

const serverEnv = {
  DATABASE_URL: E2E_DATABASE_URL,
  SESSION_SECRET,
  ADMIN_PASSWORD,
  // 구글 버튼이 뜨면 시나리오가 흔들리므로 E2E에서는 끈다
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
};

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: webBaseUrl,
    trace: "retain-on-failure",
    locale: "ko-KR",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalWeb
    ? undefined
    : [
        {
          command: `pnpm --filter @theta/web exec next ${serverMode} --port ${WEB_PORT}`,
          url: `${webBaseUrl}/login`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: serverEnv,
        },
        {
          command: `pnpm --filter @theta/office exec next ${serverMode} --port ${OFFICE_PORT}`,
          url: officeBaseUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: serverEnv,
        },
      ],
  metadata: { officeBaseUrl },
});
