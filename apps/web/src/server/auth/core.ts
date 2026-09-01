import { eq, sql } from "drizzle-orm";
import { users, type Database, type User } from "@theta/db";
import { hashPassword, verifyPassword } from "./password";
import { hueFromNickname, sanitizeNickname, uniqueNickname } from "./nickname";
import {
  isValidEmail,
  nicknameError,
  normalizeEmail,
  normalizeNickname,
  passwordError,
} from "./validation";

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; status: number; message: string };

const SUSPENDED_MESSAGE = "제재된 계정이에요. 문의가 필요하면 고객센터로 연락해 주세요.";

async function findByEmail(db: Database, email: string): Promise<User | undefined> {
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  return rows[0];
}

async function nicknameTaken(db: Database, nickname: string): Promise<boolean> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.nickname, nickname))
    .limit(1);
  return rows.length > 0;
}

export interface SignupInput {
  email: string;
  password: string;
  nickname: string;
}

export async function signup(db: Database, input: SignupInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email ?? "");
  const nickname = normalizeNickname(input.nickname ?? "");
  const password = input.password ?? "";

  if (!isValidEmail(email)) return { ok: false, status: 400, message: "이메일 형식이 올바르지 않아요." };
  const nickErr = nicknameError(nickname);
  if (nickErr) return { ok: false, status: 400, message: nickErr };
  const pwErr = passwordError(password);
  if (pwErr) return { ok: false, status: 400, message: pwErr };

  if (await findByEmail(db, email))
    return { ok: false, status: 409, message: "이미 가입된 이메일이에요." };
  if (await nicknameTaken(db, nickname))
    return { ok: false, status: 409, message: "이미 쓰이는 닉네임이에요." };

  try {
    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash: await hashPassword(password),
        nickname,
        hue: hueFromNickname(nickname),
      })
      .returning();
    return { ok: true, user: created! };
  } catch (e) {
    // 동시 가입 경합 — 유니크 제약이 최종 방어선
    if (isUniqueViolation(e)) return { ok: false, status: 409, message: "이미 가입된 이메일이에요." };
    throw e;
  }
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function login(db: Database, input: LoginInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email ?? "");
  const found = await findByEmail(db, email);

  // 계정 존재 여부를 노출하지 않도록 실패 메시지를 하나로 합친다
  if (!found || !(await verifyPassword(input.password ?? "", found.passwordHash)))
    return { ok: false, status: 401, message: "이메일 또는 비밀번호가 올바르지 않아요." };

  if (found.status === "suspended") return { ok: false, status: 403, message: SUSPENDED_MESSAGE };

  await touchLastActive(db, found.id);
  return { ok: true, user: found };
}

export async function touchLastActive(db: Database, userId: string): Promise<void> {
  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, userId));
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
}

/**
 * 구글 계정 매칭 3분기:
 *   ① google_sub이 있으면 그 계정으로 로그인
 *   ② 이메일이 같은 기존 계정이 있으면 google_sub을 연결
 *   ③ 둘 다 없으면 신규 생성(닉네임은 구글 이름 기반, 중복 시 숫자 접미)
 */
export async function findOrCreateGoogleUser(
  db: Database,
  profile: GoogleProfile,
): Promise<AuthResult> {
  const email = normalizeEmail(profile.email ?? "");
  if (!profile.sub) return { ok: false, status: 400, message: "구글 계정 정보를 읽지 못했어요." };

  const bySub = await db.select().from(users).where(eq(users.googleSub, profile.sub)).limit(1);
  if (bySub[0]) {
    if (bySub[0].status === "suspended") return { ok: false, status: 403, message: SUSPENDED_MESSAGE };
    await touchLastActive(db, bySub[0].id);
    return { ok: true, user: bySub[0] };
  }

  if (email) {
    const byEmail = await findByEmail(db, email);
    if (byEmail) {
      if (byEmail.status === "suspended")
        return { ok: false, status: 403, message: SUSPENDED_MESSAGE };
      const [linked] = await db
        .update(users)
        .set({ googleSub: profile.sub, lastActiveAt: new Date() })
        .where(eq(users.id, byEmail.id))
        .returning();
      return { ok: true, user: linked! };
    }
  }

  if (!isValidEmail(email))
    return { ok: false, status: 400, message: "구글 계정의 이메일을 확인하지 못했어요." };

  const nickname = await uniqueNickname(sanitizeNickname(profile.name ?? email.split("@")[0] ?? ""), (n) =>
    nicknameTaken(db, n),
  );
  const [created] = await db
    .insert(users)
    .values({
      email,
      googleSub: profile.sub,
      nickname,
      hue: hueFromNickname(nickname),
      // 비밀번호 없이 만들어진 계정 — verifyPassword가 항상 실패해 비밀번호 로그인은 막힌다
      passwordHash: null,
    })
    .returning();
  return { ok: true, user: created! };
}

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return (err.cause?.code ?? err.code) === "23505";
}
