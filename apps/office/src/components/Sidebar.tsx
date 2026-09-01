"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@theta/ui";
import { AdminLogoutButton } from "./auth/AdminLogoutButton";

const NAV = [
  { href: "/", label: "대시보드", icon: "📊" },
  { href: "/users", label: "유저", icon: "👥" },
  { href: "/cost", label: "비용·모델", icon: "🧮" },
  { href: "/experiments", label: "A/B 실험", icon: "🧪" },
  { href: "/notices", label: "공지 관리", icon: "📣" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-dvh w-14 shrink-0 flex-col border-r border-line bg-surface md:w-52">
      <Link
        href="/"
        className="flex h-14 items-center justify-center gap-2 border-b border-line md:justify-start md:px-4"
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-[15px] font-black text-white">
          θ
        </span>
        <span className="hidden text-[15px] font-extrabold md:block">
          세타 오피스
        </span>
      </Link>
      <nav className="flex-1 space-y-1 p-2">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center justify-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors md:justify-start md:px-3",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-text-sub hover:bg-surface-2 hover:text-text",
              )}
            >
              <span aria-hidden>{item.icon}</span>
              <span className="hidden md:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line p-2">
        <AdminLogoutButton />
      </div>
    </aside>
  );
}
