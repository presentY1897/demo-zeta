import { sql } from "drizzle-orm";
import { plots, sessions, users, type Database } from "@theta/db";
import { eq, inArray } from "drizzle-orm";

export const PAGE_SIZE = 20;

export type SortKey = "lastActiveAt" | "turns" | "tokens";
export type PlanFilter = "all" | "free" | "pass";
export type StatusFilter = "all" | "active" | "suspended";

export interface UserListQuery {
  q: string;
  plan: PlanFilter;
  status: StatusFilter;
  sort: SortKey;
  page: number;
}

export interface UserRow {
  id: string;
  nickname: string;
  email: string;
  country: "KR" | "JP" | "US";
  plan: "free" | "pass";
  status: "active" | "suspended";
  hue: number;
  isSeed: boolean;
  joinedAt: string;
  lastActiveAt: string;
  turns: number;
  tokens: number;
}

/** searchParams는 무엇이든 들어올 수 있으니 여기서 한 번에 정규화한다 */
export function parseUserQuery(params: Record<string, string | string[] | undefined>): UserListQuery {
  const one = (key: string): string => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const plan = one("plan");
  const status = one("status");
  const sort = one("sort");
  const page = Number.parseInt(one("page"), 10);

  return {
    q: one("q").trim().slice(0, 60),
    plan: plan === "free" || plan === "pass" ? plan : "all",
    status: status === "active" || status === "suspended" ? status : "all",
    sort: sort === "turns" || sort === "tokens" ? sort : "lastActiveAt",
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** 시드 유저의 모델별 토큰(jsonb) 합 */
const seedTokenSum = sql`coalesce((
  select sum(value::numeric) from jsonb_each_text(u.seed_tokens_by_model)
), 0)`;

const ORDER_BY: Record<SortKey, ReturnType<typeof sql>> = {
  lastActiveAt: sql`u.last_active_at desc`,
  turns: sql`turns desc`,
  tokens: sql`tokens desc`,
};

export interface UserListResult {
  rows: UserRow[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * 시드 800명과 실가입 유저를 한 목록에서 다룬다.
 * 턴·토큰은 시드 컬럼과 usage_events 합산이므로 정렬도 SQL에서 합산값으로 한다.
 */
export async function listUsers(db: Database, query: UserListQuery): Promise<UserListResult> {
  const like = `%${query.q}%`;
  const search = query.q
    ? sql`and (u.nickname ilike ${like} or u.email ilike ${like})`
    : sql``;
  const planFilter = query.plan === "all" ? sql`` : sql`and u.plan = ${query.plan}`;
  const statusFilter = query.status === "all" ? sql`` : sql`and u.status = ${query.status}`;
  const where = sql`where true ${search} ${planFilter} ${statusFilter}`;

  const totalResult = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from users u ${where}`,
  );
  const total = Number(totalResult.rows[0]?.n ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const offset = (page - 1) * PAGE_SIZE;

  const result = await db.execute<Record<string, unknown>>(sql`
    with usage_by_user as (
      select user_id, count(*)::int as turns,
             coalesce(sum(est_input_tokens + est_output_tokens), 0)::int as tokens
      from usage_events
      group by user_id
    )
    select
      u.id, u.nickname, u.email, u.country, u.plan, u.status, u.hue, u.is_seed,
      to_char(timezone('Asia/Seoul', u.joined_at), 'YYYY-MM-DD') as joined_at,
      to_char(timezone('Asia/Seoul', u.last_active_at), 'YYYY-MM-DD') as last_active_at,
      (u.seed_turns + coalesce(ub.turns, 0))::int as turns,
      (${seedTokenSum} + coalesce(ub.tokens, 0))::bigint as tokens
    from users u
    left join usage_by_user ub on ub.user_id = u.id
    ${where}
    order by ${ORDER_BY[query.sort]}, u.id
    limit ${PAGE_SIZE} offset ${offset}
  `);

  return { rows: result.rows.map(toUserRow), total, page, pageCount };
}

function toUserRow(r: Record<string, unknown>): UserRow {
  return {
    id: String(r.id),
    nickname: String(r.nickname),
    email: String(r.email),
    country: r.country as UserRow["country"],
    plan: r.plan as UserRow["plan"],
    status: r.status as UserRow["status"],
    hue: Number(r.hue),
    isSeed: Boolean(r.is_seed),
    joinedAt: String(r.joined_at),
    lastActiveAt: String(r.last_active_at),
    turns: Number(r.turns),
    tokens: Number(r.tokens),
  };
}

export interface UserDetail extends UserRow {
  /** 시드 모델별 누적 토큰 — 실사용분은 모델 귀속이 없어 따로 센다 */
  seedTokensByModel: Record<string, number>;
  realTokens: number;
  favorites: { id: string; name: string; emoji: string }[];
}

export async function getUserDetail(db: Database, id: string): Promise<UserDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const result = await db.execute<Record<string, unknown>>(sql`
    with usage_by_user as (
      select user_id, count(*)::int as turns,
             coalesce(sum(est_input_tokens + est_output_tokens), 0)::int as tokens
      from usage_events where user_id = ${id}
      group by user_id
    )
    select
      u.id, u.nickname, u.email, u.country, u.plan, u.status, u.hue, u.is_seed,
      u.seed_tokens_by_model, u.favorite_plot_ids,
      to_char(timezone('Asia/Seoul', u.joined_at), 'YYYY-MM-DD') as joined_at,
      to_char(timezone('Asia/Seoul', u.last_active_at), 'YYYY-MM-DD') as last_active_at,
      (u.seed_turns + coalesce(ub.turns, 0))::int as turns,
      (${seedTokenSum} + coalesce(ub.tokens, 0))::bigint as tokens,
      coalesce(ub.tokens, 0)::int as real_tokens
    from users u
    left join usage_by_user ub on ub.user_id = u.id
    where u.id = ${id}
  `);

  const row = result.rows[0];
  if (!row) return null;

  const favoriteIds = (row.favorite_plot_ids as string[] | null) ?? [];
  const favorites =
    favoriteIds.length === 0
      ? []
      : await db
          .select({ id: plots.id, name: plots.name, emoji: plots.emoji })
          .from(plots)
          .where(inArray(plots.id, favoriteIds));

  return {
    ...toUserRow(row),
    seedTokensByModel: (row.seed_tokens_by_model as Record<string, number> | null) ?? {},
    realTokens: Number(row.real_tokens),
    favorites,
  };
}

/**
 * 제재/해제. 제재하면 그 유저의 세션을 전부 지워 즉시 로그아웃시킨다 —
 * 이후 로그인·채팅이 막히는 것은 T2·T4에서 이미 구현된 경로다.
 */
export async function setUserSuspended(
  db: Database,
  id: string,
  suspended: boolean,
): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;

  const updated = await db
    .update(users)
    .set({ status: suspended ? "suspended" : "active" })
    .where(eq(users.id, id))
    .returning({ id: users.id });
  if (updated.length === 0) return false;

  if (suspended) await db.delete(sessions).where(eq(sessions.userId, id));
  return true;
}
