import Link from "next/link";
import { cn } from "@theta/ui";
import type { UserListQuery } from "@/server/users";

function hrefFor(query: UserListQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.plan !== "all") params.set("plan", query.plan);
  if (query.status !== "all") params.set("status", query.status);
  if (query.sort !== "lastActiveAt") params.set("sort", query.sort);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/users?${qs}` : "/users";
}

const buttonClass =
  "inline-flex h-8 items-center rounded-lg bg-surface-2 px-3 text-[13px] font-medium text-text transition-colors hover:bg-line";

export function UserPager({
  query,
  page,
  pageCount,
}: {
  query: UserListQuery;
  page: number;
  pageCount: number;
}) {
  const first = page <= 1;
  const last = page >= pageCount;

  return (
    <div className="flex items-center justify-between">
      <p className="text-[12px] text-text-faint">
        {page} / {pageCount} 페이지
      </p>
      <div className="flex gap-1.5">
        <Link
          href={hrefFor(query, page - 1)}
          aria-disabled={first}
          tabIndex={first ? -1 : undefined}
          className={cn(buttonClass, first && "pointer-events-none opacity-40")}
        >
          이전
        </Link>
        <Link
          href={hrefFor(query, page + 1)}
          aria-disabled={last}
          tabIndex={last ? -1 : undefined}
          className={cn(buttonClass, last && "pointer-events-none opacity-40")}
        >
          다음
        </Link>
      </div>
    </div>
  );
}
