import { cache } from "react";
import { cookies } from "next/headers";
import { db, type User } from "@theta/db";
import { SESSION_COOKIE, findSessionUser } from "./session";

/**
 * RSC에서 현재 로그인 유저를 읽는다. next/headers를 쓰는 유일한 어댑터로,
 * 실제 검증 로직(findSessionUser)은 Request/토큰만 받는 순수 함수라 테스트에서 직접 부를 수 있다.
 * React cache()로 한 요청 안의 중복 조회를 막는다.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  return findSessionUser(db, token);
});

export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  return user;
}
