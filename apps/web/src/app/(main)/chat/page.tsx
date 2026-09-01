import { db } from "@theta/db";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { getCurrentUser } from "@/server/auth/current-user";
import { listPlots } from "@/server/plots/queries";

export const dynamic = "force-dynamic";

export default async function ChatListPage() {
  const user = await getCurrentUser();
  // 방 목록은 아직 브라우저(chat-store)에 있고, 플롯 정보만 서버에서 해석한다 — T4에서 전부 서버로
  const plots = await listPlots(db, { viewerId: user?.id ?? null });

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-lg font-extrabold">대화</h1>
      <ChatRoomList plots={plots} />
    </div>
  );
}
