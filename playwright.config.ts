import { defineConfig, devices } from "@playwright/test";
import { loadRootEnv } from "@theta/db/env";

loadRootEnv(process.cwd());

/**
 * 스모크 E2E. 기본은 로컬 dev 서버를 자동 기동하고 전용 DB(theta_e2e)에 시드를 넣는다.
 * `E2E_BASE_URL`을 주면 이미 떠 있는 서버(배포 URL 포함)를 그대로 쓴다 — T7의 배포 스모크가 이 경로다.
 */
const externalWeb = process.env.E2E_BASE_URL;
const externalOffice = process.env.E2E_OFFICE_URL;

const WEB_PORT = 3100;
const OFFICE_PORT = 3101;
const webBaseUrl = externalWeb ?? `http://localhost:${WEB_PORT}`;
const officeBaseUrl = externalOffice ?? `http://localhost:${OFFICE_PORT}`;

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/theta_e2e";

const serverEnv = {
  DATABASE_URL: E2E_DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-session-secret",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "theta-office",
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
  globalSetup: externalWeb ? undefined : "./e2e/global-setup.ts",
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
          command: `pnpm --filter @theta/web exec next dev --port ${WEB_PORT}`,
          url: `${webBaseUrl}/login`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: serverEnv,
        },
        {
          command: `pnpm --filter @theta/office exec next dev --port ${OFFICE_PORT}`,
          url: officeBaseUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: serverEnv,
        },
      ],
  metadata: { officeBaseUrl },
});
