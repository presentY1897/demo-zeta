import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@theta/db";
import { MyPlotList } from "@/components/MyPlotList";
import { getCurrentUser } from "@/server/auth/current-user";
import { listOwnedPlots } from "@/server/plots/queries";

export const dynamic = "force-dynamic";

export default async function MyPlotsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const plots = await listOwnedPlots(db, user.id);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <Link
          href="/my"
          className="text-sm text-text-faint underline underline-offset-4 hover:text-text-sub"
        >
          ← MY
        </Link>
        <h1 className="mt-2 text-lg font-extrabold">내가 만든 플롯</h1>
      </div>

      {plots.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface py-16 text-center">
          <span className="text-4xl" aria-hidden>
            ✍️
          </span>
          <p className="text-sm text-text-sub">아직 만든 플롯이 없어요.</p>
          <Link
            href="/create"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
          >
            첫 플롯 만들기
          </Link>
        </div>
      ) : (
        <MyPlotList plots={plots} />
      )}
    </div>
  );
}
