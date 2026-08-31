import { experiments } from "@theta/mocks";
import { Card } from "@theta/ui";

export const metadata = { title: "A/B 실험" };

export default function ExperimentsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">A/B 실험</h1>
        <p className="mt-1 text-sm text-text-sub">
          실험 {experiments.length}건 로드 완료 (진행 중{" "}
          {experiments.filter((e) => e.status === "running").length}건)
        </p>
      </div>
      <Card className="p-6 text-sm text-text-sub">
        실험 목록과 변형별 지표 비교(리텐션, 턴 수), 결론 기록이 이 자리에
        들어갑니다.
      </Card>
    </div>
  );
}
