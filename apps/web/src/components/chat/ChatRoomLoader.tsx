"use client";

import { Spinner } from "@theta/ui";
import { PlotNotFound } from "@/components/PlotNotFound";
import { usePlot } from "@/lib/plots";
import { ChatRoom } from "./ChatRoom";

/** 정적/유저 생성 플롯을 해석한 뒤 채팅방을 연다 */
export function ChatRoomLoader({ id }: { id: string }) {
  const lookup = usePlot(id);

  if (lookup.status === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (lookup.status === "missing") return <PlotNotFound />;
  return <ChatRoom plot={lookup.plot} />;
}
