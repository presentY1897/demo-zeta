import { db } from "@theta/db";
import { DashboardView } from "@/components/DashboardView";
import { DemoReset } from "@/components/DemoReset";
import { loadMetricSeries } from "@/server/metrics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // 시드 90일 + 실사용(usage_events·실가입)을 합친 시계열. 기간 전환은 클라이언트가 잘라 쓴다
  const series = await loadMetricSeries(db);
  return (
    <div className="space-y-5">
      <DashboardView series={series} />
      <DemoReset />
    </div>
  );
}
