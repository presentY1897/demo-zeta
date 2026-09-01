import { describe, expect, it } from "vitest";
import { inspectImage } from "./sniff";
import { fakeImageBytes, imageFixture, FIXTURE_SIZE } from "./fixtures";

describe("매직 바이트 판정", () => {
  it.each([
    ["png", "image/png"],
    ["jpeg", "image/jpeg"],
    ["webp", "image/webp"],
    ["webpLossless", "image/webp"],
    ["webpAlpha", "image/webp"],
  ] as const)("%s는 %s로 읽고 픽셀 크기까지 뽑는다", (kind, contentType) => {
    expect(inspectImage(imageFixture(kind))).toEqual({
      contentType,
      width: FIXTURE_SIZE.width,
      height: FIXTURE_SIZE.height,
    });
  });

  it("확장자만 이미지인 텍스트는 거부한다", () => {
    expect(inspectImage(fakeImageBytes())).toBeNull();
  });

  it("빈 바이트와 짧은 바이트를 거부한다", () => {
    expect(inspectImage(new Uint8Array(0))).toBeNull();
    expect(inspectImage(imageFixture("png").subarray(0, 12))).toBeNull();
  });

  it("시그니처만 흉내 낸 바이트는 거부한다", () => {
    // PNG 시그니처 뒤에 IHDR이 없다
    const fake = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(32),
    ]);
    expect(inspectImage(fake)).toBeNull();
    // RIFF/WEBP 컨테이너인데 아는 청크가 없다
    const riff = Buffer.alloc(64);
    riff.write("RIFF", 0, "ascii");
    riff.write("WEBP", 8, "ascii");
    riff.write("XXXX", 12, "ascii");
    expect(inspectImage(riff)).toBeNull();
  });

  it("SOF 세그먼트가 나오기 전에 스캔이 시작되면 크기를 알 수 없다고 본다", () => {
    const jpeg = imageFixture("jpeg");
    // SOI 뒤에 곧장 SOS 마커를 놓아 SOF를 지운 형태
    const truncated = Buffer.concat([jpeg.subarray(0, 2), Buffer.from([0xff, 0xda, 0x00, 0x02])]);
    expect(inspectImage(truncated)).toBeNull();
  });
});
