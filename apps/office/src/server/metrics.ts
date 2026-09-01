import { sql } from "drizzle-orm";
import { dailyMetrics, type Database } from "@theta/db";
import type { DailyMetric } from "@theta/mocks";
import {
  dateRange,
  mergeMetricSeries,
  todayInSeoul,
  type MetricPoint,
  type RealDailyPoint,
} from "@/lib/metric-point";

/**
 * 시드 지표 + 실사용을 합친 전체 시계열(시드 시작일 ~ 오늘).
 * 화면은 여기서 받은 배열을 기존 metrics-utils로 잘라 쓰므로 차트 코드는 그대로다.
 */
export async function loadMetricSeries(db: Database, now: Date = new Date()): Promise<MetricPoint[]> {
  const [seedRows, realRows] = await Promise.all([loadSeed(db), loadReal(db)]);

  const seed = new Map(seedRows.map((m) => [m.date, m]));
  const real = new Map(realRows.map((r) => [r.date, r]));

  const today = todayInSeoul(now);
  const start = seedRows[0]?.date ?? today;
  const lastReal = realRows[realRows.length - 1]?.date ?? today;
  const end = lastReal > today ? lastReal : today;

  return mergeMetricSeries(dateRange(start, end), seed, real);
}

async function loadSeed(db: Database): Promise<DailyMetric[]> {
  const rows = await db.select().from(dailyMetrics).orderBy(dailyMetrics.date);
  return rows.map((r) => ({
    date: r.date,
    dau: r.dau,
    newUsers: r.newUsers,
    turns: r.turns,
    tokens: r.tokens as DailyMetric["tokens"],
    gpuCostKrw: r.gpuCostKrw,
    revenueKrw: r.revenueKrw,
    feeKrw: r.feeKrw,
  }));
}

/**
 * 실사용 집계 — 턴은 usage_events 행 수, DAU는 그날의 distinct 유저,
 * 신규 가입은 실가입 유저(is_seed=false)의 가입일, 토큰은 추정치 합.
 * 날짜 경계는 한국 시간 기준이다.
 */
async function loadReal(db: Database): Promise<RealDailyPoint[]> {
  const result = await db.execute<{
    date: string;
    dau: number;
    turns: number;
    new_users: number;
    tokens: number;
  }>(sql`
    with usage_daily as (
      select
        (timezone('Asia/Seoul', created_at))::date as day,
        count(*)::int as turns,
        count(distinct user_id)::int as dau,
        coalesce(sum(est_input_tokens + est_output_tokens), 0)::int as tokens
      from usage_events
      group by 1
    ),
    signup_daily as (
      select
        (timezone('Asia/Seoul', joined_at))::date as day,
        count(*)::int as new_users
      from users
      where is_seed = false
      group by 1
    )
    select
      to_char(coalesce(u.day, s.day), 'YYYY-MM-DD') as date,
      coalesce(u.dau, 0) as dau,
      coalesce(u.turns, 0) as turns,
      coalesce(s.new_users, 0) as new_users,
      coalesce(u.tokens, 0) as tokens
    from usage_daily u
    full outer join signup_daily s on s.day = u.day
    order by 1
  `);

  return result.rows.map((r) => ({
    date: r.date,
    dau: Number(r.dau),
    turns: Number(r.turns),
    newUsers: Number(r.new_users),
    tokens: Number(r.tokens),
  }));
}
