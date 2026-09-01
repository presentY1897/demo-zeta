import type { Metadata } from "next";
import { db } from "@theta/db";
import { PlotNotFound } from "@/components/PlotNotFound";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { getCurrentUser } from "@/server/auth/current-user";
import { getPlotForViewer } from "@/server/plots/queries";

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

  // 메시지 저장은 아직 브라우저(chat-store) — T4에서 서버로 옮긴다
  return <ChatRoom plot={plot} />;
}
