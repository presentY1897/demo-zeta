"use client";

import { useState } from "react";
import type { UserStatus } from "@theta/mocks";
import { Button } from "@theta/ui";
import { StatusBadge } from "./UserBadges";

/** 제재/해제 처리 — 데모라 로컬 상태로만 반영된다 */
export function SanctionControls({
  nickname,
  initialStatus,
}: {
  nickname: string;
  initialStatus: UserStatus;
}) {
  const [status, setStatus] = useState<UserStatus>(initialStatus);
  const suspended = status === "suspended";

  function toggle() {
    const message = suspended
      ? `${nickname} 유저의 제재를 해제할까요?`
      : `${nickname} 유저를 제재할까요? 서비스 이용이 즉시 차단돼요.`;
    if (window.confirm(message)) {
      setStatus(suspended ? "active" : "suspended");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <StatusBadge status={status} />
      <Button
        variant={suspended ? "secondary" : "danger"}
        size="sm"
        onClick={toggle}
      >
        {suspended ? "제재 해제" : "제재하기"}
      </Button>
      <span className="text-[11px] text-text-faint">
        데모: 이 세션에서만 반영돼요
      </span>
    </div>
  );
}
