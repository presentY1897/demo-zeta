/**
 * 커버 이미지 제한 — 위저드(클라이언트)와 업로드 API(서버)가 같은 값을 본다.
 * `plot-limits.ts`와 같은 역할이며, 값이 갈라지면 "브라우저에서는 통과했는데 서버가 거부"가 생긴다.
 */
export const COVER_LIMITS = {
  /** 업로드로 받아 주는 최대 바이트 — 클라이언트 재인코딩 결과는 보통 이보다 한참 작다 */
  maxBytes: 2 * 1024 * 1024,
  /** 서버가 허용하는 최대 픽셀 변(가로·세로 공통) */
  maxEdge: 2000,
  /** 사용자가 고르는 원본 파일의 상한 — 디코딩 전에 걸러 브라우저가 멎는 것을 막는다 */
  maxSourceBytes: 20 * 1024 * 1024,
  /** 재인코딩 목표 크기(4:3) */
  targetWidth: 800,
  targetHeight: 600,
  /** webp 재인코딩 품질 */
  quality: 0.8,
} as const;

export const COVER_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type CoverContentType = (typeof COVER_CONTENT_TYPES)[number];

export function isCoverContentType(value: string): value is CoverContentType {
  return (COVER_CONTENT_TYPES as readonly string[]).includes(value);
}

/** 사용자에게 보여 줄 용량 표기 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
