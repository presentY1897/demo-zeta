import { afterEach, describe, expect, it } from "vitest";
import {
  ADMIN_TTL_MS,
  checkAdminPassword,
  isAdminRequest,
  issueAdminToken,
  verifyAdminToken,
  ADMIN_COOKIE,
} from "./admin-auth";

const SECRET = process.env.SESSION_SECRET;

afterEach(() => {
  process.env.SESSION_SECRET = SECRET;
  process.env.ADMIN_PASSWORD = "test-admin-password";
});

describe("admin 토큰", () => {
  it("발급한 토큰은 검증을 통과한다", () => {
    const { token, expiresAt } = issueAdminToken();
    expect(verifyAdminToken(token)).toBe(true);
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(ADMIN_TTL_MS - 5_000);
  });

  it("만료된 토큰은 거부한다", () => {
    const past = Date.now() - ADMIN_TTL_MS - 1000;
    const { token } = issueAdminToken(past);
    expect(verifyAdminToken(token)).toBe(false);
  });

  it("변조된 토큰은 거부한다 — 만료시각만 늘려도 서명이 깨진다", () => {
    const { token } = issueAdminToken();
    const [payload, signature] = token.split(".");
    const forged = `${Number(payload) + 10 * ADMIN_TTL_MS}.${signature}`;
    expect(verifyAdminToken(forged)).toBe(false);
    expect(verifyAdminToken(`${payload}.${signature}x`)).toBe(false);
    expect(verifyAdminToken("아무값")).toBe(false);
    expect(verifyAdminToken(null)).toBe(false);
  });

  it("다른 SESSION_SECRET으로 만든 토큰은 통하지 않는다", () => {
    process.env.SESSION_SECRET = "another-secret";
    const { token } = issueAdminToken();
    process.env.SESSION_SECRET = SECRET;
    expect(verifyAdminToken(token)).toBe(false);
  });
});

describe("admin 비밀번호", () => {
  it("정확히 일치할 때만 통과한다", () => {
    expect(checkAdminPassword("test-admin-password")).toBe(true);
    expect(checkAdminPassword("test-admin-passwor")).toBe(false);
    expect(checkAdminPassword("")).toBe(false);
  });

  it("ADMIN_PASSWORD가 없으면 아무도 통과시키지 않는다", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(checkAdminPassword("")).toBe(false);
    expect(checkAdminPassword("test-admin-password")).toBe(false);
  });
});

describe("요청 판정", () => {
  it("쿠키에 담긴 유효 토큰만 인정한다", () => {
    const { token } = issueAdminToken();
    const withCookie = new Request("http://localhost:3001/", {
      headers: { cookie: `${ADMIN_COOKIE}=${encodeURIComponent(token)}` },
    });
    expect(isAdminRequest(withCookie)).toBe(true);
    expect(isAdminRequest(new Request("http://localhost:3001/"))).toBe(false);
  });
});
