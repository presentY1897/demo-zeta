import { db } from "@theta/db";
import { CostView } from "@/components/CostView";
import { loadMetricSeries } from "@/server/metrics";

export const dynamic = "force-dynamic";

export const metadata = { title: "비용·모델" };

export default async function CostPage() {
  const series = await loadMetricSeries(db);
  return <CostView series={series} />;
}
