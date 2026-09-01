import type { Page } from "@playwright/test";

/** 실행마다 겹치지 않는 계정 정보 */
export function newAccount(prefix: string) {
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    email: `${prefix}-${unique}@example.com`,
    password: "theta-demo",
    nickname: `${prefix}${unique}`.slice(0, 20),
  };
}

export async function signUp(page: Page, account: ReturnType<typeof newAccount>): Promise<void> {
  await page.goto("/login");
  await page.getByRole("tab", { name: "회원가입" }).click();
  await page.getByPlaceholder("이메일").fill(account.email);
  await page.getByPlaceholder("닉네임 (20자 이내)").fill(account.nickname);
  await page.getByPlaceholder("비밀번호 (8자 이상)").fill(account.password);
  await page.getByRole("button", { name: "가입하고 시작하기" }).click();
  await page.waitForURL("**/");
}

export async function logOut(page: Page): Promise<void> {
  await page.goto("/my");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await page.waitForURL("**/");
}

export interface PlotDraft {
  name: string;
  tagline: string;
  description: string;
  persona: string;
  firstMessage: string;
  tag: string;
  visibility: "공개" | "비공개";
}

/** 만들기 위저드 4단계를 끝까지 진행하고 생성된 플롯 프로필 URL로 이동한다 */
export async function createPlot(page: Page, draft: PlotDraft): Promise<void> {
  await page.goto("/create");

  await page.getByLabel("캐릭터 이름").fill(draft.name);
  await page.getByLabel("한 줄 소개").fill(draft.tagline);
  await page.getByRole("button", { name: "다음" }).click();

  await page.getByLabel("세계관 소개").fill(draft.description);
  await page.getByLabel("성격·말투 (페르소나)").fill(draft.persona);
  await page.getByRole("button", { name: "다음" }).click();

  await page.getByLabel("첫 메시지").fill(draft.firstMessage);
  await page.getByRole("button", { name: "다음" }).click();

  await page.getByRole("button", { name: `#${draft.tag}`, exact: true }).first().click();
  await page.getByRole("button", { name: draft.visibility, exact: false }).first().click();
  await page.getByRole("button", { name: "플롯 만들기" }).click();
  await page.waitForURL(/\/plots\//);
}
