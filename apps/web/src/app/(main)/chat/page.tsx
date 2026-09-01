import Link from "next/link";
import { db } from "@theta/db";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { getCurrentUser } from "@/server/auth/current-user";
import { listRooms } from "@/server/rooms/queries";

export const dynamic = "force-dynamic";

export default async function ChatListPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-lg font-extrabold">대화</h1>
      {user ? (
        <ChatRoomList rooms={await listRooms(db, user.id)} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface py-16 text-center">
          <span className="text-4xl" aria-hidden>
            💬
          </span>
          <p className="text-sm text-text-sub">
            로그인하면 어느 기기에서든 대화를 이어갈 수 있어요.
          </p>
          <Link
            href="/login"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
          >
            로그인하기
          </Link>
        </div>
      )}
    </div>
  );
}
