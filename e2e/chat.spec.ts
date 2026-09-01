import { expect, test } from "@playwright/test";
import { newAccount, signUp } from "./helpers";

/**
 * T4 시나리오 — 대화가 서버에 남는다.
 * 모의 모델로 돌리므로 API 키 없이도 매 실행 검증된다.
 */
test("대화가 서버에 남고 새로고침해도 이어진다", async ({ page }) => {
  await signUp(page, newAccount("chatter"));

  // 시드 플롯으로 대화 시작
  await page.goto("/plots/seojun-contract");
  await page.getByRole("link", { name: /대화 시작하기/ }).click();
  await page.waitForURL("**/chat/seojun-contract");

  // 첫 메시지(seq 0)가 보인다
  await expect(page.getByText("조건은 간단해")).toBeVisible();

  const composer = page.getByRole("textbox");
  await composer.fill("계약서 조건을 다시 설명해 줘");
  await composer.press("Enter");

  // 스트리밍이 끝나면 응답 버블이 남는다
  await expect(page.getByText("계약서 조건을 다시 설명해 줘", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "↺ 다시 생성" })).toBeVisible({ timeout: 30_000 });

  const bubbles = page.locator(".rounded-2xl");
  const beforeReload = await bubbles.count();
  expect(beforeReload).toBeGreaterThanOrEqual(3);

  // 새로고침해도 대화가 그대로다 — 서버에 저장됐다는 뜻
  await page.reload();
  await expect(page.getByText("계약서 조건을 다시 설명해 줘", { exact: true })).toBeVisible();
  await expect(bubbles).toHaveCount(beforeReload);

  // 대화 목록에도 올라온다
  await page.goto("/chat");
  await expect(page.locator('a[href="/chat/seojun-contract"]')).toBeVisible();
});

test("중단하면 받은 데까지 보존되고, 재생성·초기화가 서버에 반영된다", async ({ page }) => {
  await signUp(page, newAccount("stopper"));

  await page.goto("/chat/muhyeok-master");
  await expect(page.getByText("사부 삼아 달라 했던")).toBeVisible();

  const composer = page.getByRole("textbox");
  await composer.fill("수련을 시작하겠습니다");
  await composer.press("Enter");

  // 응답이 흘러나오기 시작한 뒤에 중단해야 "받은 데까지 보존"이 검증된다
  // (모의 모델은 첫 토큰 전 0.6~1.1초를 쉬므로 그 전에 끊으면 저장할 내용이 없다)
  await expect(page.getByText(/강무혁이/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "응답 중단" }).click();
  await expect(page.getByText("⏹ 응답이 중단됐어요")).toBeVisible({ timeout: 30_000 });

  // 새로고침해도 중단 표시가 남아 있다 — interrupted 플래그가 저장됐다
  await page.reload();
  await expect(page.getByText("⏹ 응답이 중단됐어요")).toBeVisible();

  // 재생성하면 중단 표시가 사라진 새 응답으로 바뀐다
  await page.getByRole("button", { name: "↺ 다시 생성" }).click();
  await expect(page.getByText("⏹ 응답이 중단됐어요")).toHaveCount(0, { timeout: 30_000 });
  // 스트리밍 중에는 초기화가 막혀 있으므로 재생성이 끝날 때까지 기다린다
  await expect(page.getByRole("button", { name: "응답 중단" })).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "↺ 다시 생성" })).toBeVisible();

  // 초기화하면 첫 메시지만 남고, 새로고침에도 유지된다
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "대화 초기화" }).click();
  await expect(page.getByText("수련을 시작하겠습니다", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("수련을 시작하겠습니다", { exact: true })).toHaveCount(0);
  await expect(page.getByText("사부 삼아 달라 했던")).toBeVisible();
});
