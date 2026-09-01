/**
 * 테스트용 이미지 바이트. 전부 **실제 인코더가 만든 진짜 파일**이라
 * 매직 바이트·헤더 파싱이 손으로 지어낸 바이트가 아니라 현실의 파일을 상대한다.
 * (20×15 픽셀, Pillow로 생성 후 base64로 고정)
 */
const FIXTURES = {
  png: "iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAIAAABr+ngCAAAAU0lEQVR4nJ3SSQ6AIBBE0UJBHIDE+1/WHTEMTXUnb/t33wF4rDxeAM6mxpvBP961mtir9HHgDeODNIsjQ4jPJTm+ZMv4FjDxdFAyTkN8nHuquDQ+ND0H/ZX21M0AAAAASUVORK5CYII=",
  jpeg: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAPABQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDxTTvDOcfJ+ldRp3hbOP3f6V6LpXhxTjha7HSvDKnbwtfP4XFfWjzMm4ocbanlUHhP92P3f6UV7wugW8KKspVWIz0zRXTOWBpycKlaCkt05JP8z9Bp8UzcVa5//9k=",
  /** canvas.toBlob("image/webp", 0.8)이 만드는 것과 같은 손실 압축(VP8) */
  webp: "UklGRpAAAABXRUJQVlA4IIQAAABwBACdASoUAA8APm0qkUWkIqGYBABABsS2AE6ZQjgbwD8VQJpxMozMIxsOAAD+/6uSBpM7Oeyjcn0E8+zWYbAy1ahEeVhJEL3/hdEumJMNYWMN9kztDDz9fSNMfMMeOlJnq+fm25w6ifVArrIr71T+fFLGMxxtv+TkxFW5fHZVb4U0AAA=",
  /** 무손실(VP8L) — 크기가 비트 단위로 패킹돼 있어 파싱 경로가 다르다 */
  webpLossless: "UklGRjQAAABXRUJQVlA4TCcAAAAvE4ADALkyRPQ/dlH/6H+ASNumFu7f8ODhLAgJUojZmABYOai8AAMA",
  /** 투명도가 있는 확장 컨테이너(VP8X) — 또 다른 파싱 경로 */
  webpAlpha:
    "UklGRgwBAABXRUJQVlA4WAoAAAAQAAAAEwAADgAAQUxQSBwAAAABDzD/ERFCMQA00K/dqOklk9EIIvrfA3Gso/EDVlA4IMoAAAAQBgCdASoUAA8APm0qkUWkIqGYBABABsS2AE6ZQjubyX8K+ECMMzKBMpaCAPv/vcmv/bHNPgm1e64A/vxWi7hx+krdxvxzhgJusg/fnthxjGEGaUfhXfmUHt9iey7EMJPNVXysX4TIH7jqZxn2g3x+7JhXjzxguJDxx6cMsfj9MW6QYxv31GejRVHKyuwOEnLykuVhZ9aCYijmYeTEqxr80tox699UgsTZqDMrIFQCI3z+TRU7BrPwEs5kosAvlFX5m59ZRuY7J4AA",
  /** 2400×1 — 서버 픽셀 상한(2000px)을 넘는 진짜 PNG */
  pngTooWide:
    "iVBORw0KGgoAAAANSUhEUgAACWAAAAABCAIAAADVHwIVAAAAIklEQVR4nO3BoQEAAAgDIK3mZf8/00MEerIFAAAAAAAA/HDPzAA+hhEQlgAAAABJRU5ErkJggg==",
} as const;

export const FIXTURE_SIZE = { width: 20, height: 15 } as const;

export function imageFixture(kind: keyof typeof FIXTURES): Buffer {
  return Buffer.from(FIXTURES[kind], "base64");
}

/** 확장자만 이미지인 텍스트 파일 — 매직 바이트 검증이 잡아내야 하는 대상 */
export function fakeImageBytes(): Buffer {
  return Buffer.from("이건 그냥 텍스트인데 파일 이름만 cover.png 입니다.", "utf8");
}
