"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@theta/ui";

const TABS = [
  {
    href: "/",
    label: "홈",
    icon: (
      <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" strokeLinejoin="round" />
    ),
  },
  {
    href: "/chat",
    label: "대화",
    icon: (
      <path
        d="M21 12a8 8 0 0 1-8 8H4l1.6-3.2A8 8 0 1 1 21 12Z"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/create",
    label: "만들기",
    icon: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
  },
  {
    href: "/my",
    label: "MY",
    icon: (
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
] as const;

/** 모바일 하단 탭 바 — sm 이상에서는 상단 네비게이션이 대신한다 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
      <div className="grid h-14 grid-cols-4">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                active ? "text-primary" : "text-text-faint",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="size-5"
                aria-hidden
              >
                {tab.icon}
              </svg>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
