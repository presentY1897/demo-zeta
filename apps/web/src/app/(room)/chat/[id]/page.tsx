import { notFound } from "next/navigation";
import { getPlot, plots } from "@theta/mocks";
import { ChatRoom } from "@/components/chat/ChatRoom";

export function generateStaticParams() {
  return plots.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: getPlot(id)?.name ?? "대화" };
}

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plot = getPlot(id);
  if (!plot) notFound();
  return <ChatRoom plot={plot} />;
}
