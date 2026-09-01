import { expect, test } from "@playwright/test";
import { fakePngFile, makePng } from "./fixtures";
import { createPlot, newAccount, signUp } from "./helpers";

/** 업로드된 커버는 항상 이 URL로 서빙된다 */
const COVER_SRC = /^\/api\/images\//;

/**
 * T8 시나리오 — 위저드에서 올린 사진이 홈·프로필·채팅에 썸네일로 붙고,
 * 안 올린 플롯(시드 12개 포함)은 이모지+그라디언트 폴백이 그대로 살아 있는지 확인한다.
 */
test("올린 커버는 홈·프로필·채팅에 썸네일로 보이고 미첨부 플롯은 이모지 폴백이다", async ({
  page,
}) => {
  const suffix = Date.now().toString(36).slice(-5);
  const withCover = `사진있는${suffix}`;
  const withoutCover = `사진없는${suffix}`;

  await signUp(page, newAccount("cover"));

  // 수 MB짜리 원본 사진 — 브라우저에서 4:3 800×600 webp로 줄여야 2MB 상한을 통과한다
  const photo = makePng(1600, 1200);
  expect(photo.byteLength).toBeGreaterThan(2 * 1024 * 1024);

  await createPlot(page, {
    name: withCover,
    tagline: "커버 사진이 있는 플롯",
    description: "사진이 붙은 세계관",
    persona: "밝은 말투",
    firstMessage: "*손을 흔든다* 안녕!",
    tag: "로맨스",
    visibility: "공개",
    cover: { name: "photo.png", mimeType: "image/png", buffer: photo },
  });

  // ① 프로필 헤더
  const profileUrl = page.url();
  const heroImage = page.getByRole("img", { name: withCover }).first();
  await expect(heroImage).toBeVisible();
  const src = await heroImage.getAttribute("src");
  expect(src).toMatch(COVER_SRC);

  // 서빙 응답이 immutable 캐시로 내려간다
  const served = await page.request.get(src!);
  expect(served.status()).toBe(200);
  expect(served.headers()["content-type"]).toBe("image/webp");
  expect(served.headers()["cache-control"]).toContain("immutable");
  // 클라이언트 재인코딩으로 원본보다 훨씬 작아졌다
  expect((await served.body()).byteLength).toBeLessThan(photo.byteLength / 5);

  // 커버 없는 플롯도 하나 만들어 둔다
  await createPlot(page, {
    name: withoutCover,
    tagline: "이모지 폴백 플롯",
    description: "사진이 없는 세계관",
    persona: "조용한 말투",
    firstMessage: "*고개를 끄덕인다*",
    tag: "판타지",
    visibility: "공개",
  });
  await expect(page.getByRole("img", { name: withoutCover })).toHaveCount(0);

  // ② 홈 카드 — 올린 쪽만 <img>, 나머지는 이모지 폴백
  await page.goto("/");
  const coveredCard = page.getByRole("link").filter({ hasText: withCover });
  await expect(coveredCard.locator("img")).toHaveAttribute("src", COVER_SRC);

  const plainCard = page.getByRole("link").filter({ hasText: withoutCover });
  await expect(plainCard.locator("img")).toHaveCount(0);
  // 시드 플롯 12개도 폴백 경로 그대로다
  await expect(page.getByRole("link").filter({ hasText: "강무혁" }).locator("img")).toHaveCount(0);

  // ③ 채팅 아바타 → ④ 대화 목록 썸네일
  await page.goto(`${profileUrl.replace("/plots/", "/chat/")}`);
  await expect(page.getByRole("img", { name: withCover }).first()).toHaveAttribute(
    "src",
    COVER_SRC,
  );

  await page.goto("/chat");
  const roomRow = page.getByRole("link").filter({ hasText: withCover });
  await expect(roomRow.locator("img")).toHaveAttribute("src", COVER_SRC);
});

test("확장자만 이미지인 파일은 사용자에게 보이는 에러로 거부된다", async ({ page }) => {
  await signUp(page, newAccount("badcover"));
  await page.goto("/create");

  await page.getByLabel("커버 이미지").setInputFiles(fakePngFile());

  await expect(page.getByText("이미지를 읽지 못했어요")).toBeVisible();
  // 미리보기가 붙지 않아 커버 없이 진행된다
  await expect(page.getByAltText("커버 이미지 미리보기")).toHaveCount(0);
});
