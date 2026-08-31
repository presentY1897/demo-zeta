import type { DemoAccount } from "./types";

/** 로그인 화면에서 선택하는 데모 계정 */
export const demoAccounts: DemoAccount[] = [
  {
    id: "demo-new",
    nickname: "별빛여우",
    plan: "free",
    hue: 210,
    description: "오늘 막 가입한 신규 유저",
  },
  {
    id: "demo-heavy",
    nickname: "달빛토끼",
    plan: "pass",
    hue: 280,
    description: "매일 2시간씩 대화하는 세타패스 유저",
  },
  {
    id: "demo-creator",
    nickname: "이야기장인",
    plan: "pass",
    hue: 340,
    description: "플롯 12개를 만든 크리에이터",
  },
];
