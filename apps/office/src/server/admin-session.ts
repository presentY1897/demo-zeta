import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminToken } from "./admin-auth";

/** RSC용 어댑터 — 실제 검증은 admin-auth의 순수 함수가 한다 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value ?? null;
  return verifyAdminToken(token);
}
