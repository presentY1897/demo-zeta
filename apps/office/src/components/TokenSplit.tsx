import { models, type MockUser } from "@theta/mocks";
import { formatCompact, formatKrw, formatPct } from "@/lib/format";
import { MODEL_COLORS } from "@/lib/palette";

/** 글로벌 평균 입출력 비율(950:430)로 환산한 1M 토큰당 블렌디드 원가 */
function blendedCostPer1M(id: (typeof models)[number]["id"]): number {
  const m = models.find((x) => x.id === id)!;
  return (950 * m.costPer1MInputKrw + 430 * m.costPer1MOutputKrw) / 1380;
}

/** 유저의 모델별 토큰 비중 — 100% 가로 스택(2px 서피스 갭) + 상세 행 */
export function TokenSplit({ user }: { user: MockUser }) {
  const total = models.reduce((acc, m) => acc + user.tokensByModel[m.id], 0);
  if (total === 0) {
    return <p className="text-sm text-text-faint">토큰 사용 기록이 없어요.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {models.map((m) => {
          const share = user.tokensByModel[m.id] / total;
          if (share <= 0) return null;
          return (
            <div
              key={m.id}
              style={{
                width: `${share * 100}%`,
                background: MODEL_COLORS[m.id],
              }}
            />
          );
        })}
      </div>
      <ul className="space-y-1.5">
        {models.map((m) => {
          const tokens = user.tokensByModel[m.id];
          const cost = (tokens / 1_000_000) * blendedCostPer1M(m.id);
          return (
            <li
              key={m.id}
              className="flex items-center justify-between text-[13px]"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-[3px]"
                  style={{ background: MODEL_COLORS[m.id] }}
                />
                <span className="font-semibold">{m.label}</span>
                <span className="text-text-faint">
                  {formatPct(tokens / total)}
                </span>
              </span>
              <span className="tabular-nums text-text-sub">
                {formatCompact(tokens)} 토큰 · 추정 {formatKrw(Math.round(cost))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
