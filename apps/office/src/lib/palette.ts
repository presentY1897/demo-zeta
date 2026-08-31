import type { ModelId } from "@theta/mocks";

/**
 * 차트 팔레트 — dataviz 검증 스크립트로 서피스 #15151f 기준 전 체크 통과.
 * (인접쌍 CVD ΔE 8.4, 전쌍은 상위 3슬롯까지 안전 — 시리즈 4개 이상 금지)
 * 슬롯 순서가 색약 안전 장치이므로 순서를 바꾸지 않는다.
 */
export const SERIES = [
  "#3987e5", // 1 blue
  "#d95926", // 2 orange
  "#199e70", // 3 aqua
  "#c98500", // 4 yellow
  "#d55181", // 5 magenta
] as const;

/** 단일 시리즈 강조(브랜드 바이올렛, 검증 통과 슬롯) */
export const ACCENT = "#9085e9";
/** 비강조(스파크라인, 대조군) */
export const DEEMPH = "#565670";

/** 차트 크롬 */
export const GRID = "#20202e";
export const AXIS = "#2e2e40";
export const SURFACE = "#15151f";

/** 상태 색 — 시리즈로 재사용 금지, 항상 아이콘+라벨과 함께 */
export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

/** 색은 엔티티(모델)를 따라간다 — 필터/정렬이 바뀌어도 고정 */
export const MODEL_COLORS: Record<ModelId, string> = {
  "koji-lite": SERIES[0],
  koji: SERIES[1],
  luca: SERIES[2],
};
