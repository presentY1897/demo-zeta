"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserListQuery } from "@/server/users";

const selectClass =
  "h-9 rounded-lg border border-line bg-surface px-2.5 text-[13px] outline-none focus:border-primary/60";

/** 검색·필터·정렬을 URL로 밀어 넣는다. 조건이 바뀌면 1페이지로 돌아간다 */
export function UserFilters({ query }: { query: UserListQuery }) {
  const router = useRouter();
  const [q, setQ] = useState(query.q);

  const push = (patch: Partial<UserListQuery>) => {
    const next = { ...query, ...patch };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.plan !== "all") params.set("plan", next.plan);
    if (next.status !== "all") params.set("status", next.status);
    if (next.sort !== "lastActiveAt") params.set("sort", next.sort);
    // 조건이 바뀌면 페이지는 리셋 — page는 UserPager가 붙인다
    const qs = params.toString();
    router.push(qs ? `/users?${qs}` : "/users");
  };

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        push({ q });
      }}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => q !== query.q && push({ q })}
        placeholder="닉네임 또는 이메일 검색"
        aria-label="유저 검색"
        className="h-9 w-56 rounded-lg border border-line bg-surface px-3 text-[13px] outline-none placeholder:text-text-faint focus:border-primary/60"
      />
      <select
        aria-label="플랜 필터"
        value={query.plan}
        onChange={(e) => push({ plan: e.target.value as UserListQuery["plan"] })}
        className={selectClass}
      >
        <option value="all">플랜: 전체</option>
        <option value="pass">세타패스</option>
        <option value="free">무료</option>
      </select>
      <select
        aria-label="상태 필터"
        value={query.status}
        onChange={(e) => push({ status: e.target.value as UserListQuery["status"] })}
        className={selectClass}
      >
        <option value="all">상태: 전체</option>
        <option value="active">활성</option>
        <option value="suspended">제재</option>
      </select>
      <select
        aria-label="정렬"
        value={query.sort}
        onChange={(e) => push({ sort: e.target.value as UserListQuery["sort"] })}
        className={selectClass}
      >
        <option value="lastActiveAt">최근 활동순</option>
        <option value="turns">턴 많은순</option>
        <option value="tokens">토큰 많은순</option>
      </select>
    </form>
  );
}
