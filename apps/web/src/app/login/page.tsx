"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoAccounts } from "@theta/mocks";
import { Avatar } from "@theta/ui";
import { useSession } from "@/lib/session";

/**
 * 데모용 로그인 — 실서비스라면 OAuth(카카오/구글/애플)가 붙을 자리.
 * 리뷰어가 환경변수 없이 바로 체험할 수 있도록 계정 선택형으로 구성했다.
 */
export default function LoginPage() {
  const login = useSession((s) => s.login);
  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-3xl font-black text-white">
          θ
        </span>
        <h1 className="mt-4 text-xl font-extrabold">세타에 어서 오세요</h1>
        <p className="mt-1 text-sm text-text-sub">
          체험할 데모 계정을 선택해 주세요.
        </p>
      </div>

      <div className="space-y-2.5">
        {demoAccounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => {
              login({
                id: account.id,
                nickname: account.nickname,
                plan: account.plan,
                hue: account.hue,
              });
              router.push("/");
            }}
            className="flex w-full items-center gap-3 rounded-card border border-line bg-surface p-4 text-left transition-colors hover:border-primary/60"
          >
            <Avatar
              label={account.nickname[0] ?? "θ"}
              hue={account.hue}
              size={44}
            />
            <div className="flex-1">
              <p className="flex items-center gap-1.5 text-[15px] font-bold">
                {account.nickname}
                {account.plan === "pass" && (
                  <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    PASS
                  </span>
                )}
              </p>
              <p className="text-[12px] text-text-faint">
                {account.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      <Link
        href="/"
        className="text-center text-sm text-text-faint underline underline-offset-4 hover:text-text-sub"
      >
        로그인 없이 둘러보기
      </Link>
    </div>
  );
}
