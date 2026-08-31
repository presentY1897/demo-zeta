import { users } from "@theta/mocks";
import { Card } from "@theta/ui";

export const metadata = { title: "유저" };

export default function UsersPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">유저</h1>
        <p className="mt-1 text-sm text-text-sub">
          시드 유저 {users.length.toLocaleString()}명 로드 완료
        </p>
      </div>
      <Card className="p-6 text-sm text-text-sub">
        유저 목록(검색/필터/정렬)과 상세 화면 — 활동량, 모델별 토큰 사용,
        플랜/제재 처리가 이 자리에 들어갑니다.
      </Card>
    </div>
  );
}
