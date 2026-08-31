import { experiments, type Experiment } from "@theta/mocks";
import { Card, cn } from "@theta/ui";
import { formatPct } from "@/lib/format";
import { ACCENT, DEEMPH } from "@/lib/palette";

export const metadata = { title: "A/B 실험" };

/**
 * 변형 비교 — 강조 형식: 실험군(B)은 강조색, 대조군(A)은 비강조 회색.
 * 값은 막대 끝 바깥에 직접 라벨.
 */
function MetricBars({
  label,
  variants,
  format,
}: {
  label: string;
  variants: { key: string; name: string; value: number; emphasis: boolean }[];
  format: (n: number) => string;
}) {
  const max = Math.max(...variants.map((v) => v.value), 0.0001);
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold text-text-sub">{label}</p>
      <div className="space-y-1.5">
        {variants.map((v) => (
          <div key={v.key} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-[11px] font-bold text-text-faint">
              {v.key}
            </span>
            <div className="h-3.5 flex-1">
              <div
                className="h-full rounded-r-[4px]"
                style={{
                  width: `${(v.value / max) * 100}%`,
                  background: v.emphasis ? ACCENT : DEEMPH,
                  minWidth: 2,
                }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[12px] font-semibold tabular-nums">
              {format(v.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function lift(a: number, b: number): string {
  if (a === 0) return "—";
  const v = (b - a) / a;
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

function ExperimentCard({ exp }: { exp: Experiment }) {
  const [a, b] = exp.variants;
  if (!a || !b) return null;
  const running = exp.status === "running";

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-bold">{exp.name}</h2>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
            running
              ? "bg-success/15 text-success"
              : "bg-surface-2 text-text-sub",
          )}
        >
          <span aria-hidden>{running ? "●" : "■"}</span>
          {running ? "진행 중" : "종료"}
        </span>
        <span className="text-[12px] text-text-faint">
          {exp.startedAt}
          {exp.endedAt ? ` ~ ${exp.endedAt}` : " ~"}
        </span>
      </div>

      <p className="text-[13px] leading-relaxed text-text-sub">
        {exp.hypothesis}
      </p>

      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <MetricBars
          label="D1 리텐션"
          variants={exp.variants.map((v) => ({
            key: v.key,
            name: v.label,
            value: v.d1Retention,
            emphasis: v.key === "B",
          }))}
          format={(n) => formatPct(n, 0)}
        />
        <MetricBars
          label="유저당 턴"
          variants={exp.variants.map((v) => ({
            key: v.key,
            name: v.label,
            value: v.turnsPerUser,
            emphasis: v.key === "B",
          }))}
          format={(n) => n.toFixed(1)}
        />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-[12px] text-text-sub">
        <span>
          A · {a.label}{" "}
          <span className="tabular-nums text-text-faint">
            ({a.users.toLocaleString("ko-KR")}명)
          </span>
        </span>
        <span>
          B · {b.label}{" "}
          <span className="tabular-nums text-text-faint">
            ({b.users.toLocaleString("ko-KR")}명)
          </span>
        </span>
        <span className="ml-auto">
          리텐션 리프트{" "}
          <span className="font-semibold text-text">
            {lift(a.d1Retention, b.d1Retention)}
          </span>{" "}
          · 턴{" "}
          <span className="font-semibold text-text">
            {lift(a.turnsPerUser, b.turnsPerUser)}
          </span>
        </span>
      </div>

      {exp.conclusion && (
        <p className="rounded-xl bg-primary-soft px-4 py-2.5 text-[13px] leading-relaxed text-text">
          <span className="font-bold text-primary">결론 · </span>
          {exp.conclusion}
        </p>
      )}
    </Card>
  );
}

export default function ExperimentsPage() {
  const running = experiments.filter((e) => e.status === "running");
  const done = experiments.filter((e) => e.status === "done");

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">A/B 실험</h1>
        <p className="mt-1 text-sm text-text-sub">
          진행 중 {running.length}건 · 종료 {done.length}건
        </p>
      </div>
      {[...running, ...done].map((exp) => (
        <ExperimentCard key={exp.id} exp={exp} />
      ))}
    </div>
  );
}
