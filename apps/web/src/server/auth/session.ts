import { randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { sessions, users, type Database, type User } from "@theta/db";

export const SESSION_COOKIE = "theta_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** 쿠키에 담기는 세션 토큰 — 랜덤 32바이트 */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

export async function issueSession(db: Database, userId: string): Promise<IssuedSession> {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ token, userId, expiresAt });
  return { token, expiresAt };
}

/**
 * 토큰으로 유저를 찾는다. 만료된 세션은 조회 시점에 정리한다.
 * 세션 검증이 곧 로그인 상태의 유일한 진실 — 클라이언트 저장소는 관여하지 않는다.
 */
export async function findSessionUser(db: Database, token: string | null): Promise<User | null> {
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const found = rows[0]?.user ?? null;
  if (!found) {
    // 만료됐거나 없는 토큰 — 남아 있으면 지운다
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  return found;
}

export async function revokeSession(db: Database, token: string | null): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.token, token));
}

/** 제재·비밀번호 변경 시 해당 유저를 모든 기기에서 로그아웃시킨다 */
export async function revokeUserSessions(db: Database, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function purgeExpiredSessions(db: Database): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
