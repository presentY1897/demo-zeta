import { getPlot, plots } from "@theta/mocks";
import { ChatRoomLoader } from "@/components/chat/ChatRoomLoader";

/** 정적 플롯은 프리렌더, 유저 생성 플롯(u-*)은 클라이언트에서 해석 */
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
  return <ChatRoomLoader id={id} />;
}
