import { expect, test } from "@playwright/test";
import { createPlot, logOut, newAccount, signUp } from "./helpers";

/**
 * T3 시나리오 — 이번 서버화의 핵심 요구.
 * 한 유저가 만든 공개 플롯이 다른 유저의 홈과 URL에서 보이고, 비공개는 보이지 않는다.
 */
test("공개 플롯은 다른 계정에게 보이고 비공개 플롯은 보이지 않는다", async ({ page }) => {
  const author = newAccount("author");
  const suffix = Date.now().toString(36).slice(-5);
  const publicName = `열린캐릭터${suffix}`;
  const privateName = `숨은캐릭터${suffix}`;

  await signUp(page, author);

  await createPlot(page, {
    name: publicName,
    tagline: "누구나 볼 수 있는 플롯",
    description: "공개 플롯의 세계관",
    persona: "밝고 친근한 말투",
    firstMessage: "*손을 흔든다* 안녕!",
    tag: "로맨스",
    visibility: "공개",
  });
  await expect(page.getByRole("heading", { name: publicName })).toBeVisible();
  const publicUrl = page.url();

  await createPlot(page, {
    name: privateName,
    tagline: "나만 보는 플롯",
    description: "비공개 플롯의 세계관",
    persona: "조용한 말투",
    firstMessage: "*고개를 끄덕인다*",
    tag: "판타지",
    visibility: "비공개",
  });
  await expect(page.getByText("비공개").first()).toBeVisible();
  const privateUrl = page.url();

  // 작성자 본인의 홈에는 둘 다 보인다
  await page.goto("/");
  await expect(page.getByText(publicName)).toBeVisible();
  await expect(page.getByText(privateName)).toBeVisible();

  // 다른 계정으로 전환
  await logOut(page);
  await signUp(page, newAccount("reader"));

  await page.goto("/");
  await expect(page.getByText(publicName)).toBeVisible();
  await expect(page.getByText(privateName)).toHaveCount(0);

  // 공개 플롯은 URL로도 열린다
  await page.goto(publicUrl);
  await expect(page.getByRole("heading", { name: publicName })).toBeVisible();
  await expect(page.getByText(`@${author.nickname}`)).toBeVisible();

  // 비공개 플롯은 URL을 알아도 열리지 않는다
  await page.goto(privateUrl);
  await expect(page.getByText("플롯을 찾을 수 없어요.")).toBeVisible();
});

test("태그 필터가 URL에 실려 공유된다", async ({ page }) => {
  await page.goto("/?tag=무협");
  await expect(page.getByRole("button", { name: "#무협" })).toHaveAttribute(
    "class",
    /border-primary|bg-primary/,
  );
  // 시드 플롯 중 무협 태그를 가진 강무혁이 보인다
  await expect(page.getByText("강무혁")).toBeVisible();
});
