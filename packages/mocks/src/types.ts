export type Plan = "free" | "pass";
export type Country = "KR" | "JP" | "US";
export type UserStatus = "active" | "suspended";
export type ModelId = "koji-lite" | "koji" | "luca";

/** 유저가 대화를 시작할 수 있는 캐릭터/시나리오 단위 */
export interface Plot {
  id: string;
  name: string;
  tagline: string;
  description: string;
  persona: string;
  tags: string[];
  firstMessage: string;
  creator: string;
  emoji: string;
  gradient: [string, string];
  chats: number;
  likes: number;
  createdAt: string;
}

export interface MockUser {
  id: string;
  nickname: string;
  country: Country;
  plan: Plan;
  status: UserStatus;
  hue: number;
  joinedAt: string;
  lastActiveAt: string;
  totalTurns: number;
  /** 모델별 누적 토큰 (input+output 합) */
  tokensByModel: Record<ModelId, number>;
  favoritePlotIds: string[];
}

export interface DemoAccount {
  id: string;
  nickname: string;
  plan: Plan;
  hue: number;
  description: string;
}

export interface Notice {
  id: string;
  category: "공지" | "업데이트" | "이벤트";
  title: string;
  date: string;
  body: string;
  pinned?: boolean;
}

export interface DailyMetric {
  date: string;
  dau: number;
  newUsers: number;
  turns: number;
  /** 모델별 일간 토큰 사용량 */
  tokens: Record<ModelId, { input: number; output: number }>;
  /** GPU 서빙 비용 (원) */
  gpuCostKrw: number;
  /** 구독 매출 총액 (원) */
  revenueKrw: number;
  /** 결제 수수료 — 스토어/PG (원) */
  feeKrw: number;
}

export interface ModelInfo {
  id: ModelId;
  label: string;
  description: string;
  /** 서빙 원가 (원 / 1M 토큰) */
  costPer1MInputKrw: number;
  costPer1MOutputKrw: number;
}

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  status: "running" | "done";
  startedAt: string;
  endedAt?: string;
  variants: {
    key: "A" | "B";
    label: string;
    users: number;
    d1Retention: number;
    turnsPerUser: number;
  }[];
  conclusion?: string;
}
