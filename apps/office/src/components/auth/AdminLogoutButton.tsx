"use client";

import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.refresh();
      }}
      className="w-full rounded-lg px-2 py-2 text-left text-[13px] text-text-faint transition-colors hover:bg-surface-2 hover:text-text md:px-3"
      title="로그아웃"
    >
      <span className="md:hidden">⏻</span>
      <span className="hidden md:inline">⏻ 로그아웃</span>
    </button>
  );
}
