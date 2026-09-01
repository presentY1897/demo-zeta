"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@theta/ui";
import { StatusBadge } from "./UserBadges";

type UserStatus = "active" | "suspended";

/** 제재/해제 — DB에 영속되고 해당 유저의 세션이 즉시 끊긴다 */
export function SanctionControls({
  userId,
  nickname,
  initialStatus,
}: {
  userId: string;
  nickname: string;
  initialStatus: UserStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<UserStatus>(initialStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suspended = status === "suspended";

  async function toggle() {
    const message = suspended
      ? `${nickname} 유저의 제재를 해제할까요?`
      : `${nickname} 유저를 제재할까요? 로그인과 대화가 즉시 차단되고 기존 세션이 끊겨요.`;
    if (!window.confirm(message)) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/sanction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: !suspended }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "처리하지 못했어요.");
        return;
      }
      const data = (await res.json()) as { status: UserStatus };
      setStatus(data.status);
      router.refresh();
    } catch {
      setError("서버에 연결하지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <StatusBadge status={status} />
        <Button
          variant={suspended ? "secondary" : "danger"}
          size="sm"
          disabled={pending}
          onClick={() => void toggle()}
        >
          {pending ? "처리 중…" : suspended ? "제재 해제" : "제재하기"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
