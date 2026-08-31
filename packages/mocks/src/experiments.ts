import type { Experiment } from "./types";

export const experiments: Experiment[] = [
  {
    id: "exp-first-message",
    name: "첫 메시지 자동 이어쓰기 버튼",
    hypothesis:
      "첫 메시지 아래에 '이어쓰기' 제안 버튼을 노출하면 신규 유저의 첫 세션 이탈이 줄어들 것이다.",
    status: "running",
    startedAt: "2026-08-18",
    variants: [
      { key: "A", label: "기존 (버튼 없음)", users: 48_210, d1Retention: 0.41, turnsPerUser: 23.4 },
      { key: "B", label: "이어쓰기 버튼 노출", users: 48_355, d1Retention: 0.46, turnsPerUser: 28.1 },
    ],
  },
  {
    id: "exp-home-ranking",
    name: "홈 피드 정렬: 인기순 vs 개인화",
    hypothesis:
      "태그 선호 기반 개인화 정렬이 인기순 대비 플롯 진입률을 높일 것이다.",
    status: "running",
    startedAt: "2026-08-25",
    variants: [
      { key: "A", label: "인기순", users: 21_040, d1Retention: 0.44, turnsPerUser: 25.2 },
      { key: "B", label: "개인화 정렬", users: 21_118, d1Retention: 0.45, turnsPerUser: 26.0 },
    ],
  },
  {
    id: "exp-paywall-copy",
    name: "세타패스 결제 문구 개선",
    hypothesis:
      "'무제한 대화' 대신 '기다림 없이 계속'으로 바꾸면 결제 전환율이 오를 것이다.",
    status: "done",
    startedAt: "2026-07-14",
    endedAt: "2026-08-04",
    variants: [
      { key: "A", label: "무제한 대화", users: 92_400, d1Retention: 0.43, turnsPerUser: 24.8 },
      { key: "B", label: "기다림 없이 계속", users: 92_130, d1Retention: 0.43, turnsPerUser: 24.9 },
    ],
    conclusion:
      "전환율 +11% (p<0.01)로 B 채택. 리텐션/사용량에는 유의미한 차이 없음.",
  },
];
