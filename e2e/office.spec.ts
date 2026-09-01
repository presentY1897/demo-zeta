import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASSWORD, OFFICE_BASE_URL } from "./env";
import { newAccount, signUp } from "./helpers";

/** 오피스는 전 화면이 admin 비밀번호로 잠겨 있어 먼저 통과해야 한다 */
async function adminLogin(page: Page): Promise<void> {
  await page.goto(`${OFFICE_BASE_URL}/`);
  const password = page.getByPlaceholder("비밀번호");
  if (!(await password.isVisible().catch(() => false))) return;

  await password.fill(ADMIN_PASSWORD);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/admin/login") && r.ok()),
    page.getByRole("button", { name: "들어가기" }).click(),
  ]);
  // 쿠키가 붙고 레이아웃이 다시 그려질 때까지 기다린다
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
}

async function adminGoto(page: Page, path: string): Promise<void> {
  await adminLogin(page);
  await page.goto(`${OFFICE_BASE_URL}${path}`);
}

/**
 * T6 시나리오 — 오피스가 실제 데이터를 다룬다.
 * 웹에서 만든 활동이 오피스 지표에 잡히고, 오피스의 제재가 웹에서 효력을 갖는다.
 */
test("웹의 실사용이 대시보드에 잡히고, 제재가 로그인을 막는다", async ({ page }) => {
  const account = newAccount("officeuser");
  await signUp(page, account);

  // 모의 모델로 한 턴 주고받는다 → usage_events 1건
  await page.goto("/chat/uriel-fallen");
  const composer = page.getByRole("textbox");
  await composer.fill("오늘의 계시를 들려줘");
  await composer.press("Enter");
  await expect(page.getByRole("button", { name: "↺ 다시 생성" })).toBeVisible({ timeout: 30_000 });

  // 오피스 대시보드에 오늘 활동이 반영된다
  await adminGoto(page, "/");
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  await expect(page.getByText("시드 지표 + 실사용 합산")).toBeVisible();

  // 유저 목록에서 방금 가입한 계정을 찾는다
  await adminGoto(page, "/users");
  await page.getByLabel("유저 검색").fill(account.nickname);
  await page.getByLabel("유저 검색").press("Enter");
  const row = page.getByRole("link", { name: new RegExp(account.nickname) });
  await expect(row).toBeVisible();
  await expect(page.getByText("실가입").first()).toBeVisible();

  // 상세로 들어가 제재
  await row.click();
  // 상세 화면에만 있는 제재 버튼으로 도착을 확인한다(닉네임은 heading이 아니라 본문 텍스트다)
  await expect(page.getByRole("button", { name: "제재하기" })).toBeVisible();
  await expect(page.getByText(account.email)).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "제재하기" }).click();
  await expect(page.getByRole("button", { name: "제재 해제" })).toBeVisible();

  // 새로고침해도 제재 상태가 유지된다(= DB에 남았다)
  await page.reload();
  await expect(page.getByRole("button", { name: "제재 해제" })).toBeVisible();

  // 제재된 계정은 웹에서 로그인이 막힌다
  await page.goto("/login");
  await page.getByPlaceholder("이메일").fill(account.email);
  await page.getByPlaceholder("비밀번호").fill(account.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByText(/제재된 계정이에요/)).toBeVisible();

  // 해제하면 다시 로그인된다
  await adminGoto(page, "/users");
  await page.getByLabel("유저 검색").fill(account.nickname);
  await page.getByLabel("유저 검색").press("Enter");
  await page.getByRole("link", { name: new RegExp(account.nickname) }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "제재 해제" }).click();
  await expect(page.getByRole("button", { name: "제재하기" })).toBeVisible();

  await page.goto("/login");
  await page.getByPlaceholder("이메일").fill(account.email);
  await page.getByPlaceholder("비밀번호").fill(account.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("**/");
  await expect(page.getByRole("link", { name: "로그인" })).toHaveCount(0);
});

test("유저 목록의 검색·필터·페이지가 URL에 실린다", async ({ page }) => {
  await adminGoto(page, "/users?plan=pass&status=active&sort=turns&page=2");

  await expect(page.getByLabel("플랜 필터")).toHaveValue("pass");
  await expect(page.getByLabel("상태 필터")).toHaveValue("active");
  await expect(page.getByLabel("정렬")).toHaveValue("turns");
  await expect(page.getByText("2 /", { exact: false })).toBeVisible();
});
