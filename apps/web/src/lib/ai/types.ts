/** /api/chat 요청에 실리는 프로바이더 설정 — 키는 브라우저에서 요청 시에만 전달된다 */
export type ProviderKind = "mock" | "openai" | "anthropic";

export interface ProviderConfig {
  kind: ProviderKind;
  /** openai: OpenAI 호환 엔드포인트의 /v1 까지, anthropic: 기본 https://api.anthropic.com */
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequestBody {
  /** 대화 내용은 서버가 방에서 읽는다 — 클라이언트는 방 id와 새 발화만 보낸다 */
  roomId: string;
  provider: ProviderConfig;
  /** 이번에 새로 보내는 유저 메시지. 재생성·재시도처럼 이미 저장된 발화를 다시 쓸 때는 생략 */
  userMessage?: string;
}

/** /api/chat이 방금 저장한 유저 메시지의 seq를 알려주는 응답 헤더 */
export const USER_SEQ_HEADER = "x-theta-user-seq";
