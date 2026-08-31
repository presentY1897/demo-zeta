import { notFound } from "next/navigation";
import { getPlot, plots } from "@theta/mocks";
import { Avatar } from "@theta/ui";

export function generateStaticParams() {
  return plots.map((p) => ({ id: p.id }));
}

/** 채팅방 — 스트리밍 대화는 다음 단계에서 구현. 현재는 첫 메시지까지 렌더링 */
export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plot = getPlot(id);
  if (!plot) notFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col">
      <div className="flex items-center gap-3 border-b border-line pb-3">
        <span className="text-2xl" aria-hidden>
          {plot.emoji}
        </span>
        <div>
          <p className="font-bold">{plot.name}</p>
          <p className="text-[12px] text-text-faint">{plot.tagline}</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 py-5">
        <div className="flex items-start gap-2.5">
          <Avatar label={plot.emoji} hue={260} size={34} />
          <div className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-tl-md bg-surface-2 px-4 py-3 text-sm leading-relaxed">
            {plot.firstMessage}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-3 text-center text-[13px] text-text-faint">
        스트리밍 대화 입력창이 여기에 들어갑니다 (구현 예정)
      </div>
    </div>
  );
}
