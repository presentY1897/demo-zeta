import { notices } from "@theta/mocks";
import { Card } from "@theta/ui";

export const metadata = { title: "공지 관리" };

export default function NoticeAdminPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">공지 관리</h1>
        <p className="mt-1 text-sm text-text-sub">
          게시된 공지 {notices.length}건 로드 완료
        </p>
      </div>
      <Card className="p-6 text-sm text-text-sub">
        공지 작성/수정/고정 관리가 이 자리에 들어갑니다. 유저 앱 공지사항과
        같은 데이터 소스를 공유합니다.
      </Card>
    </div>
  );
}
