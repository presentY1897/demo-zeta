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
  provider: ProviderConfig;
  system: string;
  /** 모의 응답 생성에 쓰는 캐릭터 이름 */
  plotName: string;
  messages: ChatTurn[];
}
