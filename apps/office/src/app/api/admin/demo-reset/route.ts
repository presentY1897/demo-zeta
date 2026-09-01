import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@theta/db";
import { seed } from "@theta/db/seed";
import { adminGuard, jsonError } from "@/server/http";

export const runtime = "nodejs";
// 800여 행을 다시 넣으므로 기본(10초)보다 넉넉하게 잡는다
export const maxDuration = 60;

/**
 * 데모 초기화 — `pnpm db:seed`와 **같은 함수**를 호출해 시드 직후 상태로 되돌린다.
 * 배포된 오피스는 비밀번호가 README에 공개돼 있어 누구나 데이터를 흐트러뜨릴 수 있는데,
 * 그 복구를 화면 안에서 끝낼 수 있게 하는 장치다(그래서 최악의 피해가 "누가 리셋함"이 된다).
 * 시드 이후 쌓인 실가입·실대화·사용 기록도 함께 지워진다.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const guard = adminGuard(req);
  if (guard) return guard;

  try {
    await seed(db);
  } catch (e) {
    console.error("[demo-reset] 시드 실패", e);
    return jsonError(500, "초기화에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }

  const counts = await db.execute<{ table: string; n: number }>(sql`
    select 'plots' as table, count(*)::int as n from plots
    union all select 'users', count(*)::int from users
    union all select 'notices', count(*)::int from notices
    union all select 'daily_metrics', count(*)::int from daily_metrics
    union all select 'experiments', count(*)::int from experiments
  `);

  return NextResponse.json({
    counts: Object.fromEntries(counts.rows.map((r) => [r.table, Number(r.n)])),
  });
}
