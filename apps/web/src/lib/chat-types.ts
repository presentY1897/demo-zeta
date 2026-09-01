/** 대화방 메시지 — 서버가 채번한 seq가 곧 순서이자 식별자다(seq 0 = 플롯의 첫 메시지) */
export interface ChatMessage {
  seq: number;
  role: "user" | "assistant";
  content: string;
  /** 스트리밍이 중단돼 부분만 저장된 응답 */
  interrupted: boolean;
}

/** 대화 목록 한 줄 */
export interface RoomSummary {
  id: string;
  plotId: string;
  plotName: string;
  emoji: string;
  gradient: [string, string];
  lastMessage: string | null;
  updatedAt: number;
}
