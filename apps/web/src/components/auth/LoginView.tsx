"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoAccounts } from "@theta/mocks";
import { DEMO_PASSWORD, demoEmail } from "@theta/db/demo";
import { Avatar, Button, cn } from "@theta/ui";

type Mode = "login" | "signup";

/**
 * 이메일 가입·로그인과 데모 계정 원클릭을 한 화면에 둔다.
 * 리뷰어는 계정을 만들지 않고도(원클릭) 바로 체험할 수 있고,
 * 실제 가입 경로도 같은 화면에서 확인된다.
 */
export function LoginView() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const submit = async (path: string, body: Record<string, string>, key: string) => {
    setPending(key);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      // 서버 세션이 바뀌었으므로 RSC 트리를 새로 받아야 헤더/MY가 갱신된다
      router.replace("/");
      router.refresh();
    } catch {
      setError("네트워크 오류예요. 연결을 확인해 주세요.");
    } finally {
      setPending(null);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      void submit("/api/auth/login", { email, password }, "form");
    } else {
      void submit("/api/auth/signup", { email, password, nickname }, "form");
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-7 px-5 py-10">
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-3xl font-black text-white">
          θ
        </span>
        <h1 className="mt-4 text-xl font-extrabold">세타에 어서 오세요</h1>
        <p className="mt-1 text-sm text-text-sub">
          계정을 만들거나, 아래 데모 계정으로 바로 둘러보세요.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex rounded-xl bg-surface-2 p-1" role="tablist">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={cn(
                "flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors",
                mode === m ? "bg-surface text-text" : "text-text-sub hover:text-text",
              )}
            >
              {m === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            autoComplete="email"
            required
            className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-text-faint focus:border-primary"
          />
          {mode === "signup" && (
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임 (20자 이내)"
              maxLength={20}
              required
              className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-text-faint focus:border-primary"
            />
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "비밀번호 (8자 이상)" : "비밀번호"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
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

          <Button type="submit" size="lg" full disabled={pending !== null}>
            {pending === "form"
              ? "잠시만요…"
              : mode === "login"
                ? "로그인"
                : "가입하고 시작하기"}
          </Button>
        </form>

      </div>

      <section className="space-y-2.5">
        <h2 className="text-[13px] font-bold text-text-sub">
          바로 체험하기 <span className="font-normal text-text-faint">— 클릭 한 번으로 로그인</span>
        </h2>
        {demoAccounts.map((account) => (
          <button
            key={account.id}
            type="button"
            disabled={pending !== null}
            onClick={() =>
              void submit(
                "/api/auth/login",
                { email: demoEmail(account.id), password: DEMO_PASSWORD },
                account.id,
              )
            }
            className="flex w-full items-center gap-3 rounded-card border border-line bg-surface p-4 text-left transition-colors hover:border-primary/60 disabled:opacity-60"
          >
            <Avatar label={account.nickname[0] ?? "θ"} hue={account.hue} size={44} />
            <div className="flex-1">
              <p className="flex items-center gap-1.5 text-[15px] font-bold">
                {account.nickname}
                {account.plan === "pass" && (
                  <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    PASS
                  </span>
                )}
              </p>
              <p className="text-[12px] text-text-faint">{account.description}</p>
            </div>
            {pending === account.id && <span className="text-[12px] text-text-faint">…</span>}
          </button>
        ))}
      </section>

      <Link
        href="/"
        className="text-center text-sm text-text-faint underline underline-offset-4 hover:text-text-sub"
      >
        로그인 없이 둘러보기
      </Link>
    </div>
  );
}
