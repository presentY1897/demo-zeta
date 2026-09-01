import { describe, expect, it } from "vitest";
import { POST as adminLogin } from "./login/route";
import { POST as adminLogout } from "./logout/route";
import { ADMIN_COOKIE, verifyAdminToken } from "@/server/admin-auth";

const ORIGIN = "http://localhost:3001";

function loginRequest(password: unknown): Request {
  return new Request(`${ORIGIN}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

describe("admin 로그인", () => {
  it("올바른 비밀번호만 쿠키를 발급한다", async () => {
    const ok = await adminLogin(loginRequest("test-admin-password"));
    expect(ok.status).toBe(200);
    const token = ok.cookies.get(ADMIN_COOKIE)?.value;
    expect(token).toBeTruthy();
    expect(verifyAdminToken(token!)).toBe(true);
  });

  it("틀린 비밀번호는 401이고 쿠키가 없다", async () => {
    const res = await adminLogin(loginRequest("wrong"));
    expect(res.status).toBe(401);
    expect(res.cookies.get(ADMIN_COOKIE)?.value).toBeFalsy();
  });

  it("본문이 JSON이 아니면 400", async () => {
    const res = await adminLogin(
      new Request(`${ORIGIN}/api/admin/login`, { method: "POST", body: "not-json" }),
    );
    expect(res.status).toBe(400);
  });

  it("로그아웃은 쿠키를 비운다", async () => {
    const res = await adminLogout();
    expect(res.cookies.get(ADMIN_COOKIE)?.value).toBe("");
  });
});
