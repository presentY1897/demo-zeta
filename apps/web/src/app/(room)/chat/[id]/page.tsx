import type { Metadata } from "next";
import { db } from "@theta/db";
import { PlotNotFound } from "@/components/PlotNotFound";
import { ChatRoomLoader } from "@/components/chat/ChatRoomLoader";
import { getCurrentUser } from "@/server/auth/current-user";
import { getPlotForViewer } from "@/server/plots/queries";
import { findRoomWithMessages } from "@/server/rooms/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  const plot = await getPlotForViewer(db, id, user?.id ?? null);
  return { title: plot?.name ?? "대화" };
}

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const plot = await getPlotForViewer(db, id, user?.id ?? null);
  if (!plot) return <PlotNotFound />;

  // 페르소나는 여기서 걷어낸다 — 프롬프트 조립은 /api/chat 안에서만 일어난다
  const { persona: _persona, ...view } = plot;

  // 이미 연 방이 있으면 서버에서 읽어 넘기고, 없으면 클라이언트가 개설한다(렌더 중 쓰기 방지)
  const initial = user ? await findRoomWithMessages(db, user.id, id) : null;

  return (
    <ChatRoomLoader
      plot={view}
      initial={initial ? { roomId: initial.id, messages: initial.messages } : null}
    />
  );
}
