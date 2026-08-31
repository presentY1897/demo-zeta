import { models } from "@theta/mocks";
import { Card } from "@theta/ui";

export const metadata = { title: "비용·모델" };

export default function CostPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">비용·모델</h1>
        <p className="mt-1 text-sm text-text-sub">
          서빙 모델 {models.map((m) => m.label).join(", ")} 원가표 로드 완료
        </p>
      </div>
      <Card className="p-6 text-sm text-text-sub">
        모델별 토큰 사용 비율, GPU 서빙 비용 추이, 매출·수수료·마진 대시보드가
        이 자리에 들어갑니다.
      </Card>
    </div>
  );
}
