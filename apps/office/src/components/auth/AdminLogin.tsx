"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@theta/ui";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xs flex-col justify-center gap-6 px-5">
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-2xl font-black text-white">
          θ
        </span>
        <h1 className="mt-3 text-lg font-extrabold">세타 오피스</h1>
        <p className="mt-1 text-[13px] text-text-sub">운영자 비밀번호를 입력해 주세요.</p>
      </div>

      <form
        className="space-y-2.5"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          try {
            const res = await fetch("/api/admin/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password }),
            });
            if (!res.ok) {
              const data = (await res.json().catch(() => ({}))) as { error?: string };
              setError(data.error ?? "로그인에 실패했어요.");
              return;
            }
            router.refresh();
          } finally {
            setPending(false);
          }
        }}
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoComplete="current-password"
          autoFocus
          required
          className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-text-faint focus:border-primary"
        />
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger"
          >
            {error}
          </p>
        )}
        <Button type="submit" size="lg" full disabled={pending}>
          {pending ? "확인 중…" : "들어가기"}
        </Button>
      </form>

      <p className="text-center text-[12px] text-text-faint">
        비밀번호는 루트 <code className="text-text-sub">.env</code>의{" "}
        <code className="text-text-sub">ADMIN_PASSWORD</code>입니다.
      </p>
    </div>
  );
}
