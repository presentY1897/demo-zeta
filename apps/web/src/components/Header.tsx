"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, cn } from "@theta/ui";
import type { PublicUser } from "@/server/auth/http";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/chat", label: "대화" },
  { href: "/create", label: "만들기" },
  { href: "/notices", label: "공지사항" },
] as const;

/** 로그인 상태는 서버 세션이 유일한 진실 — 레이아웃(RSC)이 주입한다 */
export function Header({ user }: { user: PublicUser | null }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-[15px] font-black text-white">
            θ
          </span>
          <span className="text-lg font-extrabold tracking-tight">세타</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "text-text"
                    : "text-text-sub hover:bg-surface-2 hover:text-text",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user ? (
          <Link href="/my" className="flex items-center gap-2">
            <Avatar label={user.nickname[0] ?? "θ"} hue={user.hue} size={32} />
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
          >
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
