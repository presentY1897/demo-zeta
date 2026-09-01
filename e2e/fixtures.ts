import { deflateSync } from "node:zlib";

/**
 * E2E에서 첨부할 **진짜** 이미지 파일을 만든다.
 * 브라우저가 실제로 디코딩할 수 있어야 위저드의 크롭·리사이즈·webp 재인코딩 경로가 검증된다.
 * 노이즈는 고정 시드라 실행마다 같은 바이트가 나온다(시드 고정 원칙과 동일).
 */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = buildCrcTable();

export function makePng(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 비트 심도
  ihdr[9] = 2; // 컬러 타입: truecolor

  // 압축이 안 먹는 노이즈로 채워야 "수 MB짜리 원본 사진" 조건이 재현된다
  const raw = Buffer.alloc(height * (1 + width * 3));
  let seed = 0x9e3779b9;
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0; // 필터 없음
    offset += 1;
    for (let x = 0; x < width; x += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      raw[offset] = seed >>> 24;
      raw[offset + 1] = (seed >>> 16) & 0xff;
      raw[offset + 2] = (seed >>> 8) & 0xff;
      offset += 3;
    }
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** 확장자만 png인 텍스트 파일 — 사용자에게 보이는 에러로 거부돼야 한다 */
export function fakePngFile(): { name: string; mimeType: string; buffer: Buffer } {
  return {
    name: "cover.png",
    mimeType: "image/png",
    buffer: Buffer.from("이건 이미지가 아니라 그냥 텍스트입니다.", "utf8"),
  };
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = (CRC_TABLE[(c ^ buf[i]!) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
