"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { users, type MockUser } from "@theta/mocks";
import { Avatar, Button, Card } from "@theta/ui";
import { formatCompact } from "@/lib/format";
import { COUNTRY_LABEL, PlanBadge, StatusBadge } from "@/components/UserBadges";

const PAGE_SIZE = 20;

type SortKey = "lastActiveAt" | "totalTurns" | "tokens";

const userTokens = (u: MockUser) =>
  u.tokensByModel["koji-lite"] + u.tokensByModel.koji + u.tokensByModel.luca;

const selectClass =
  "h-9 rounded-lg border border-line bg-surface px-2.5 text-[13px] outline-none focus:border-primary/60";

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState<"all" | "free" | "pass">("all");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [sort, setSort] = useState<SortKey>("lastActiveAt");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = users.filter(
      (u) =>
        (plan === "all" || u.plan === plan) &&
        (status === "all" || u.status === status) &&
        (!query ||
          u.nickname.toLowerCase().includes(query) ||
          u.id.toLowerCase().includes(query)),
    );
    const cmp: Record<SortKey, (a: MockUser, b: MockUser) => number> = {
      lastActiveAt: (a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt),
      totalTurns: (a, b) => b.totalTurns - a.totalTurns,
      tokens: (a, b) => userTokens(b) - userTokens(a),
    };
    return [...list].sort(cmp[sort]);
  }, [q, plan, status, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(
    clampedPage * PAGE_SIZE,
    (clampedPage + 1) * PAGE_SIZE,
  );

  const resetPage = () => setPage(0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">유저</h1>
        <p className="mt-1 text-sm text-text-sub">
          전체 {users.length.toLocaleString()}명 · 검색 결과{" "}
          {filtered.length.toLocaleString()}명
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            resetPage();
          }}
          placeholder="닉네임 또는 ID 검색"
          className="h-9 w-56 rounded-lg border border-line bg-surface px-3 text-[13px] outline-none placeholder:text-text-faint focus:border-primary/60"
        />
        <select
          aria-label="플랜 필터"
          value={plan}
          onChange={(e) => {
            setPlan(e.target.value as typeof plan);
            resetPage();
          }}
          className={selectClass}
        >
          <option value="all">플랜: 전체</option>
          <option value="pass">세타패스</option>
          <option value="free">무료</option>
        </select>
        <select
          aria-label="상태 필터"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            resetPage();
          }}
          className={selectClass}
        >
          <option value="all">상태: 전체</option>
          <option value="active">활성</option>
          <option value="suspended">제재</option>
        </select>
        <select
          aria-label="정렬"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className={selectClass}
        >
          <option value="lastActiveAt">최근 활동순</option>
          <option value="totalTurns">턴 많은순</option>
          <option value="tokens">토큰 많은순</option>
        </select>
      </div>

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
                      <span className="block font-semibold">{u.nickname}</span>
                      <span className="block text-[11px] text-text-faint">
                        {u.id}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-text-sub">
                  {COUNTRY_LABEL[u.country]}
                </td>
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
                  {formatCompact(u.totalTurns)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatCompact(userTokens(u))}
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

      <div className="flex items-center justify-between">
        <p className="text-[12px] text-text-faint">
          {clampedPage + 1} / {pageCount} 페이지
        </p>
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            disabled={clampedPage === 0}
            onClick={() => setPage(clampedPage - 1)}
          >
            이전
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={clampedPage >= pageCount - 1}
            onClick={() => setPage(clampedPage + 1)}
          >
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
