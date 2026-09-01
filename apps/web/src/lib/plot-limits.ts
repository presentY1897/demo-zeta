/** 플롯 입력 제한 — 위저드(클라이언트)와 API(서버)가 같은 값을 본다 */
export const LIMITS = {
  name: 20,
  tagline: 40,
  description: 300,
  persona: 500,
  firstMessage: 500,
  tag: 8,
} as const;

export const MAX_TAGS = 4;
