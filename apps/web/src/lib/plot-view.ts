/**
 * 화면이 쓰는 플롯 형태. DB 행을 그대로 넘기지 않는 이유는 두 가지다 —
 * ① `persona`는 비공개 설정이라 목록·프로필 경로에 실리면 안 되고,
 * ② gradient는 DB에서 2컬럼이지만 화면에서는 튜플 하나로 다루는 게 편하다.
 *
 * 커버는 id가 아니라 **URL**로 내려간다 — 화면은 어디서 오는 이미지인지 알 필요가 없고,
 * 만들기 위저드의 미리보기는 아직 서버에 없는 blob URL을 같은 자리에 끼워 넣을 수 있다.
 */
export interface PlotView {
  id: string;
  name: string;
  tagline: string;
  description: string;
  firstMessage: string;
  tags: string[];
  emoji: string;
  gradient: [string, string];
  /** 업로드한 커버 이미지 URL. null이면 이모지 + 그라디언트 폴백 */
  coverUrl: string | null;
  /** 소유자 닉네임 */
  creator: string;
  chats: number;
  likes: number;
  visibility: "public" | "private";
  /** 지금 보고 있는 유저가 소유자인가 */
  mine: boolean;
  createdAt: string;
}

/** 채팅 프롬프트 조립에만 쓰는 확장 — 비공개 페르소나가 포함된다 */
export interface PlotWithPersona extends PlotView {
  persona: string;
}

/** 업로드 이미지의 공개 URL — 서버 매핑과 클라이언트가 같은 규칙을 쓴다 */
export function coverImageUrl(imageId: string): string {
  return `/api/images/${imageId}`;
}
