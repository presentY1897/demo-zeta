import Link from "next/link";
import { db } from "@theta/db";
import { Avatar, Card } from "@theta/ui";
import { formatCompact } from "@/lib/format";
import { COUNTRY_LABEL, PlanBadge, StatusBadge } from "@/components/UserBadges";
import { UserFilters } from "@/components/UserFilters";
import { UserPager } from "@/components/UserPager";
import { listUsers, parseUserQuery } from "@/server/users";

export const dynamic = "force-dynamic";

export const metadata = { title: "유저" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 검색·필터·정렬·페이지가 URL에 실려 SQL로 넘어간다 — 화면 상태를 공유할 수 있다
  const query = parseUserQuery(await searchParams);
  const { rows, total, page, pageCount } = await listUsers(db, query);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">유저</h1>
        <p className="mt-1 text-sm text-text-sub">
          시드 800명 + 실가입 유저 · 검색 결과 {total.toLocaleString("ko-KR")}명
        </p>
      </div>

      <UserFilters query={query} />

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead className="text-left text-[12px] text-text-sub">
            <tr className="border-b border-line">
              <th className="px-4 py-2.5 font-semibold">유저</th>
              <th className="px-3 py-2.5 font-semibold">국가</th>
              <th className="px-3 py-2.5 font-semibold">플랜</th>
              <th className="px-3 py-2.5 font-semibold">상태</th>
              <th className="px-3 py-2.5 text-right font-semibold">가입일</th>
              <th className="px-3 py-2.5 text-right font-semibold">최근 활동</th>
              <th className="px-3 py-2.5 text-right font-semibold">턴</th>
              <th className="px-4 py-2.5 text-right font-semibold">토큰</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-surface-2">
                <td className="px-4 py-2">
                  <Link href={`/users/${u.id}`} className="flex items-center gap-2.5">
                    <Avatar label={u.nickname[0] ?? "?"} hue={u.hue} size={28} />
                    <span>
                      <span className="flex items-center gap-1.5 font-semibold">
                        {u.nickname}
                        {!u.isSeed && (
                          <span className="rounded bg-primary-soft px-1 py-px text-[10px] font-semibold text-primary">
                            실가입
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-text-faint">{u.email}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-text-sub">{COUNTRY_LABEL[u.country]}</td>
                <td className="px-3 py-2">
                  <PlanBadge plan={u.plan} />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={u.status} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-sub">
                  {u.joinedAt}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-sub">
                  {u.lastActiveAt}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCompact(u.turns)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatCompact(u.tokens)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-12 text-center text-sm text-text-faint">
            조건에 맞는 유저가 없어요.
          </p>
        )}
      </Card>

      <UserPager query={query} page={page} pageCount={pageCount} />
    </div>
  );
}
