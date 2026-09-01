/**
 * 시드가 만드는 데모 계정의 자격증명. 로그인 화면의 "원클릭 체험"과 시드가 같은 값을 봐야 하므로
 * 여기 한곳에만 둔다. **DB 클라이언트(pg)를 import하지 않아 클라이언트 번들에서도 안전하다.**
 */
export const DEMO_PASSWORD = "theta-demo";

export const OFFICIAL_NICKNAME = "세타공식";
export const OFFICIAL_EMAIL = "official@theta.demo";

/** 데모 계정(@theta/mocks의 demoAccounts) id → 로그인 이메일 */
export function demoEmail(demoAccountId: string): string {
  return `${demoAccountId}@theta.demo`;
}
