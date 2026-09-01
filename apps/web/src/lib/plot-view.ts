/**
 * 화면이 쓰는 플롯 형태. DB 행을 그대로 넘기지 않는 이유는 두 가지다 —
 * ① `persona`는 비공개 설정이라 목록·프로필 경로에 실리면 안 되고,
 * ② gradient는 DB에서 2컬럼이지만 화면에서는 튜플 하나로 다루는 게 편하다.
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
