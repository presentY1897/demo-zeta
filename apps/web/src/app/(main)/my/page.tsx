"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card } from "@theta/ui";
import { useSession, useSessionUser } from "@/lib/session";

export default function MyPage() {
  const user = useSessionUser();
  const logout = useSession((s) => s.logout);
  const router = useRouter();

  if (!user) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
        <span className="text-4xl" aria-hidden>
          👋
        </span>
        <p className="text-sm text-text-sub">
          로그인하면 대화 기록과 만든 플롯을 볼 수 있어요.
        </p>
        <Link
          href="/login"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card className="flex items-center gap-4 p-5">
        <Avatar label={user.nickname[0] ?? "θ"} hue={user.hue} size={56} />
        <div className="flex-1">
          <p className="text-lg font-extrabold">{user.nickname}</p>
          <span className="mt-0.5 inline-block rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold text-primary">
            {user.plan === "pass" ? "세타패스" : "무료 플랜"}
          </span>
        </div>
      </Card>

      <Card className="divide-y divide-line">
        <Link
          href="/notices"
          className="flex items-center justify-between p-4 text-sm transition-colors hover:bg-surface-2"
        >
          공지사항 <span className="text-text-faint">›</span>
        </Link>
        <Link
          href="/my/ai"
          className="flex items-center justify-between p-4 text-sm transition-colors hover:bg-surface-2"
        >
          내 AI 연결 <span className="text-text-faint">›</span>
        </Link>
        <div className="flex items-center justify-between p-4 text-sm text-text-faint">
          내가 만든 플롯 <span>구현 예정</span>
        </div>
      </Card>

      <Button
        variant="secondary"
        full
        onClick={() => {
          logout();
          router.push("/");
        }}
      >
        로그아웃
      </Button>
    </div>
  );
}
