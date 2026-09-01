import { NextResponse } from "next/server";
import { isAdminRequest } from "./admin-auth";

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** admin 쿠키가 없으면 401 응답을, 통과면 null을 돌려준다 — 관리 API 공통 가드 */
export function adminGuard(req: Request): NextResponse | null {
  return isAdminRequest(req) ? null : jsonError(401, "운영자 로그인이 필요해요.");
}

/** 본문이 JSON 객체가 아니면 빈 객체로 — 검증은 서버 코어가 한다 */
export async function readJsonObject(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await req.json();
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return null;
  }
}
