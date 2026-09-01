import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken, isExpired, SESSION_TTL_MS } from "./session";
import { hueFromNickname, sanitizeNickname, uniqueNickname } from "./nickname";
import { isValidEmail, nicknameError, passwordError } from "./validation";

describe("비밀번호", () => {
  it("해시한 비밀번호는 원문과 검증된다", async () => {
    const hash = await hashPassword("theta-demo");
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(await verifyPassword("theta-demo", hash)).toBe(true);
    expect(await verifyPassword("theta-demo!", hash)).toBe(false);
  });

  it("bcrypt 형식이 아닌 해시는 어떤 비밀번호로도 통과하지 못한다 — 시드 유저 800명", async () => {
    expect(await verifyPassword("theta-demo", "!seed")).toBe(false);
    expect(await verifyPassword("", "!seed")).toBe(false);
  });

  it("해시가 없으면(구글 전용 계정) 비밀번호 로그인은 항상 실패한다", async () => {
    expect(await verifyPassword("anything", null)).toBe(false);
  });
});

describe("세션 토큰", () => {
  it("매번 다른 토큰을 발급한다", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => createSessionToken()));
    expect(tokens.size).toBe(50);
    for (const t of tokens) expect(t.length).toBeGreaterThanOrEqual(40);
  });

  it("만료 판정은 시각 비교다", () => {
    const now = new Date("2026-09-01T00:00:00Z");
    expect(isExpired(new Date(now.getTime() - 1), now)).toBe(true);
    expect(isExpired(new Date(now.getTime() + SESSION_TTL_MS), now)).toBe(false);
    // 경계: 정확히 같은 시각은 만료로 본다
    expect(isExpired(now, now)).toBe(true);
  });
});

describe("닉네임", () => {
  it("같은 닉네임은 항상 같은 hue를 갖는다", () => {
    expect(hueFromNickname("달빛토끼")).toBe(hueFromNickname("달빛토끼"));
    expect(hueFromNickname("달빛토끼")).toBeGreaterThanOrEqual(0);
    expect(hueFromNickname("달빛토끼")).toBeLessThan(360);
  });

  it("외부 이름을 다듬는다 — 공백 제거, 20자 컷, 빈 값 폴백", () => {
    expect(sanitizeNickname("  홍 길동 ")).toBe("홍길동");
    expect(sanitizeNickname("가".repeat(30))).toHaveLength(20);
    expect(sanitizeNickname("   ")).toBe("세타유저");
  });

  it("중복이면 숫자 접미를 붙인다", async () => {
    const used = new Set(["달빛여우", "달빛여우2"]);
    const taken = async (n: string) => used.has(n);
    expect(await uniqueNickname("달빛여우", taken)).toBe("달빛여우3");
    expect(await uniqueNickname("새벽고래", taken)).toBe("새벽고래");
  });

  it("접미를 붙여도 20자를 넘지 않는다", async () => {
    const base = "가".repeat(20);
    const taken = async (n: string) => n === base;
    const result = await uniqueNickname(base, taken);
    expect(result).toHaveLength(20);
    expect(result.endsWith("2")).toBe(true);
  });
});

describe("입력 검증", () => {
  it("이메일 형식", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.co")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("비밀번호는 8자 이상, 닉네임은 1~20자", () => {
    expect(passwordError("1234567")).toBeTruthy();
    expect(passwordError("12345678")).toBeNull();
    expect(nicknameError("")).toBeTruthy();
    expect(nicknameError("가".repeat(21))).toBeTruthy();
    expect(nicknameError("달빛여우")).toBeNull();
  });
});
