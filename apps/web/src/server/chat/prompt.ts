import type { RoomContext } from "@/server/rooms/queries";

/**
 * 롤플레잉 시스템 프롬프트. **서버에서만 조립한다** —
 * 비공개 설정인 페르소나가 클라이언트로 나가지 않게 하기 위함이다.
 */
export function buildSystemPrompt(plot: {
  plotName: string;
  persona: string;
  description: string;
}): string {
  return [
    `너는 인터랙티브 스토리의 캐릭터 "${plot.plotName}"이다. 아래 설정을 완전히 연기한다.`,
    "",
    `[캐릭터 설정]`,
    plot.persona,
    "",
    `[세계관]`,
    plot.description,
    "",
    `[규칙]`,
    "- 캐릭터에서 절대 벗어나지 않는다. AI라는 언급은 하지 않는다.",
    "- 행동·정경 묘사는 *별표 사이의 지문*으로, 대사는 지문 밖에 쓴다.",
    "- 한 응답은 1~3개 문단으로, 상대가 이어가기 좋게 여지를 남긴다.",
    "- 상대의 선택을 존중하고 이야기를 강제로 끌고 가지 않는다.",
    "- 한국어로 답한다.",
  ].join("\n");
}

export type { RoomContext };
