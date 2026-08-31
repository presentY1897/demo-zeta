import { dailyMetrics } from "@theta/mocks";
import { Card } from "@theta/ui";

/** 대시보드 — KPI 타일과 추이 차트는 차트 단계에서 구현 */
export default function DashboardPage() {
  const latest = dailyMetrics[dailyMetrics.length - 1];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">대시보드</h1>
        <p className="mt-1 text-sm text-text-sub">
          기준일 {latest?.date} · 최근 90일 시드 데이터 로드 완료 (
          {dailyMetrics.length}일치)
        </p>
      </div>
      <Card className="p-6 text-sm text-text-sub">
        DAU/신규 가입/대화 턴/비용·매출 KPI 타일과 추이 차트가 이 자리에
        들어갑니다. 데이터 소스(@theta/mocks)는 연결되어 있습니다.
      </Card>
    </div>
  );
}
