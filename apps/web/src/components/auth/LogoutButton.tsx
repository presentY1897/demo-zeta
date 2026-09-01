"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@theta/ui";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="secondary"
      full
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/");
        router.refresh();
      }}
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </Button>
  );
}
