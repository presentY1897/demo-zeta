import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@theta/db";
import { Avatar, Card } from "@theta/ui";
import { formatCompact } from "@/lib/format";
import { COUNTRY_LABEL, PlanBadge } from "@/components/UserBadges";
import { SanctionControls } from "@/components/SanctionControls";
import { TokenSplit } from "@/components/TokenSplit";
import { getUserDetail } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserDetail(db, id);
  if (!user) notFound();

  return (
    <div className="max-w-3xl space-y-4">
      <Link
        href="/users"
        className="text-sm text-text-faint underline underline-offset-4 hover:text-text-sub"
      >
        ← 유저 목록
      </Link>

      <Card className="flex flex-wrap items-center gap-4 p-5">
        <Avatar label={user.nickname[0] ?? "?"} hue={user.hue} size={56} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-lg font-extrabold">
            {user.nickname}
            <PlanBadge plan={user.plan} />
            {!user.isSeed && (
              <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                실가입
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[12px] text-text-faint">
            {user.email} · {COUNTRY_LABEL[user.country]} · 가입 {user.joinedAt} ·
            최근 활동 {user.lastActiveAt}
          </p>
        </div>
        <SanctionControls
          userId={user.id}
          nickname={user.nickname}
          initialStatus={user.status}
        />
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-[12px] text-text-sub">누적 대화 턴</p>
          <p className="mt-1 text-[20px] font-semibold">
            {formatCompact(user.turns)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] text-text-sub">누적 토큰</p>
          <p className="mt-1 text-[20px] font-semibold">
            {formatCompact(user.tokens)}
          </p>
          {user.realTokens > 0 && (
            <p className="mt-0.5 text-[11px] text-text-faint">
              실사용 추정 {formatCompact(user.realTokens)} 포함
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-[12px] text-text-sub">턴당 평균 토큰</p>
          <p className="mt-1 text-[20px] font-semibold">
            {user.turns > 0
              ? Math.round(user.tokens / user.turns).toLocaleString("ko-KR")
              : 0}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-bold">모델별 토큰 사용</h2>
        <TokenSplit tokensByModel={user.seedTokensByModel} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-bold">
          즐겨찾는 플롯 {user.favorites.length > 0 && `(${user.favorites.length})`}
        </h2>
        {user.favorites.length === 0 ? (
          <p className="text-sm text-text-faint">즐겨찾는 플롯이 없어요.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {user.favorites.map((plot) => (
              <li
                key={plot.id}
                className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[13px]"
              >
                <span aria-hidden>{plot.emoji}</span>
                {plot.name}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
