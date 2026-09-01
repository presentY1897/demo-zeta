import { loadRootEnv } from "@theta/db/env";

// 이 모듈이 env의 단일 진입점 — playwright.config과 스펙이 같은 값을 본다
loadRootEnv(process.cwd());

export const WEB_PORT = 3100;
export const OFFICE_PORT = 3101;

export const WEB_BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${WEB_PORT}`;
export const OFFICE_BASE_URL = process.env.E2E_OFFICE_URL ?? `http://localhost:${OFFICE_PORT}`;

/** E2E 전용 DB — 매 실행 마이그레이션 + 시드로 되돌린다 */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/theta_e2e";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "theta-office";
export const SESSION_SECRET = process.env.SESSION_SECRET ?? "e2e-session-secret";
