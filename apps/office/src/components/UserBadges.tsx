import { cn } from "@theta/ui";
import type { Plan, UserStatus } from "@theta/mocks";

/** 상태 배지 — 색만으로 전달하지 않도록 항상 아이콘+라벨 */
export function StatusBadge({ status }: { status: UserStatus }) {
  const active = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
        active ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
      )}
    >
      <span aria-hidden>{active ? "●" : "⛔"}</span>
      {active ? "활성" : "제재"}
    </span>
  );
}

export function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
        plan === "pass"
          ? "bg-primary-soft text-primary"
          : "bg-surface-2 text-text-sub",
      )}
    >
      {plan === "pass" ? "세타패스" : "무료"}
    </span>
  );
}

export const COUNTRY_LABEL: Record<string, string> = {
  KR: "🇰🇷 한국",
  JP: "🇯🇵 일본",
  US: "🇺🇸 미국",
};
