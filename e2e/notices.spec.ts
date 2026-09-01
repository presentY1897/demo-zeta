import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASSWORD, OFFICE_BASE_URL } from "./env";

async function adminLogin(page: Page): Promise<void> {
  await page.goto(`${OFFICE_BASE_URL}/notices`);
  const password = page.getByPlaceholder("비밀번호");
  if (await password.isVisible().catch(() => false)) {
    await password.fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "들어가기" }).click();
  }
  await expect(page.getByRole("heading", { name: "공지 관리" })).toBeVisible();
}

/**
 * T5 시나리오 — 오피스와 웹이 같은 DB를 보게 되면서
 * "다른 오리진이라 공유 불가"라던 기존 명시 한계가 사라진 것을 확인한다.
 */
test("오피스에서 쓴 공지가 웹에 반영되고, 고정하면 홈 배너가 바뀐다", async ({ page }) => {
  const suffix = Date.now().toString(36).slice(-5);
  const title = `점검안내${suffix}`;
  const body = `본문내용${suffix}`;

  await adminLogin(page);

  // 작성
  await page.getByLabel("카테고리").selectOption("업데이트");
  await page.getByPlaceholder("공지 제목").fill(title);
  await page.getByPlaceholder("공지 내용").fill(body);
  await page.getByRole("button", { name: "게시하기" }).click();
  await expect(page.getByText(title)).toBeVisible();

  // 웹 목록·상세에 노출
  await page.goto("/notices");
  await expect(page.getByText(title)).toBeVisible();
  await page.getByText(title).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(body)).toBeVisible();

  // 고정 → 홈 배너가 이 공지로 교체된다
  await adminLogin(page);
  const row = page.locator("li").filter({ hasText: title });
  await row.getByRole("button", { name: "고정", exact: true }).click();
  await expect(row.getByRole("button", { name: "고정 해제" })).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();

  // 삭제 → 웹에서 사라진다
  await adminLogin(page);
  page.once("dialog", (dialog) => void dialog.accept());
  await page
    .locator("li")
    .filter({ hasText: title })
    .getByRole("button", { name: "삭제" })
    .click();
  await expect(page.getByText(title)).toHaveCount(0);

  await page.goto("/notices");
  await expect(page.getByText(title)).toHaveCount(0);
});
