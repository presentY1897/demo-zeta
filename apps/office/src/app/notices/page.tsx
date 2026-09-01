import { db } from "@theta/db";
import { listNotices, toNoticeView } from "@theta/db/notices";
import { NoticeAdmin } from "@/components/NoticeAdmin";

// 작성·고정·삭제가 곧바로 보여야 하므로 캐시하지 않는다
export const dynamic = "force-dynamic";

export default async function NoticeAdminPage() {
  const items = (await listNotices(db)).map(toNoticeView);
  return <NoticeAdmin items={items} />;
}
