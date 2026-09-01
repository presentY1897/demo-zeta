import type { CoverContentType } from "@/lib/cover-limits";

/**
 * 업로드 바이트에서 이미지 종류와 픽셀 크기를 **직접** 읽는다.
 *
 * 파일 확장자와 Content-Type 헤더는 클라이언트가 마음대로 붙일 수 있으니 믿지 않는다.
 * 서버가 신뢰하는 것은 파일 앞머리의 매직 바이트뿐이다 — 클라이언트 재인코딩이 1차 방어라면
 * 이쪽이 2차 방어다(T8 구현 노트). 픽셀 크기도 여기서 읽어야 클라이언트가 보낸 값을 안 믿는다.
 */
export interface ImageInfo {
  contentType: CoverContentType;
  width: number;
  height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** 지원 형식이 아니거나 헤더가 깨져 크기를 못 읽으면 null */
export function inspectImage(bytes: Uint8Array): ImageInfo | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return inspectPng(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return inspectJpeg(bytes);
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return inspectWebp(bytes);
  return null;
}

/** PNG는 시그니처 바로 뒤 IHDR 청크에 크기가 고정 위치로 들어 있다 */
function inspectPng(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== "IHDR") return null;
  return size("image/png", uint32be(bytes, 16), uint32be(bytes, 20));
}

const NON_SOF_MARKERS = new Set([0xc4, 0xc8, 0xcc]);

/** JPEG는 세그먼트를 순회하며 SOF(프레임 시작) 마커를 찾아야 크기가 나온다 */
function inspectJpeg(bytes: Uint8Array): ImageInfo | null {
  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1]!;
    // 0xFF 채움 바이트
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    // 인자 없는 마커(SOI·RSTn·TEM)
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    // 스캔 데이터나 끝에 도달했는데 SOF가 없었다면 크기를 알 수 없다
    if (marker === 0xda || marker === 0xd9) return null;

    const length = uint16be(bytes, i + 2);
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xcf && !NON_SOF_MARKERS.has(marker)) {
      if (i + 9 > bytes.length) return null;
      // 세그먼트: 길이(2) 정밀도(1) 높이(2) 너비(2)
      return size("image/jpeg", uint16be(bytes, i + 7), uint16be(bytes, i + 5));
    }
    i += 2 + length;
  }
  return null;
}

/** WebP는 컨테이너(RIFF) 안의 첫 청크 종류에 따라 크기 위치가 다르다 */
function inspectWebp(bytes: Uint8Array): ImageInfo | null {
  const chunk = ascii(bytes, 12, 4);

  // 확장 포맷(투명도·애니메이션 등) — 헤더에 크기가 그대로 있다
  if (chunk === "VP8X") {
    if (bytes.length < 30) return null;
    return size("image/webp", uint24le(bytes, 24) + 1, uint24le(bytes, 27) + 1);
  }
  // 손실 압축 — 3바이트 프레임 태그 + 시작 코드(9d 01 2a) 뒤에 14비트씩
  if (chunk === "VP8 ") {
    if (bytes.length < 30) return null;
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return size("image/webp", uint16le(bytes, 26) & 0x3fff, uint16le(bytes, 28) & 0x3fff);
  }
  // 무손실 — 시그니처(0x2f) 뒤에 (너비-1) 14비트, (높이-1) 14비트가 LSB부터 채워진다
  if (chunk === "VP8L") {
    if (bytes.length < 25 || bytes[20] !== 0x2f) return null;
    const packed = uint32le(bytes, 21);
    return size("image/webp", (packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1);
  }
  return null;
}

function size(contentType: CoverContentType, width: number, height: number): ImageInfo | null {
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { contentType, width, height };
}

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((b, i) => bytes[i] === b);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.length < offset + length) return "";
  let out = "";
  for (let i = 0; i < length; i += 1) out += String.fromCharCode(bytes[offset + i]!);
  return out;
}

function uint16be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function uint32be(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) * 0x1000000 +
      (((bytes[offset + 1] ?? 0) << 16) | ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0))) >>>
    0
  );
}

function uint16le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function uint24le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}

function uint32le(bytes: Uint8Array, offset: number): number {
  return (uint24le(bytes, offset) | ((bytes[offset + 3] ?? 0) << 24)) >>> 0;
}
