import {
  COVER_LIMITS,
  formatBytes,
  isCoverContentType,
  type CoverContentType,
} from "./cover-limits";

/**
 * 브라우저에서 커버 이미지를 4:3으로 크롭하고 최대 800×600으로 줄인 뒤 webp로 다시 인코딩한다.
 *
 * 재인코딩이 1차 방어선이다 — 용량이 수 MB에서 수십 KB로 떨어지고, 캔버스를 거치면서
 * EXIF(촬영 위치 등) 같은 메타데이터가 통째로 사라진다. **원본 파일은 서버에 도달하지 않는다.**
 * 디코딩 자체가 실패하는 파일(확장자만 이미지인 텍스트 등)은 여기서 먼저 걸린다.
 */
export interface PreparedCover {
  blob: Blob;
  contentType: CoverContentType;
  width: number;
  height: number;
  /** <img src>에 바로 쓰는 미리보기 URL — 다 쓰면 releaseCover()로 해제한다 */
  previewUrl: string;
}

export type PrepareCoverResult =
  | { ok: true; cover: PreparedCover }
  | { ok: false; message: string };

const READ_FAILED = "이미지를 읽지 못했어요. JPG·PNG·WebP 파일인지 확인해 주세요.";

/** 첫 시도가 상한을 넘으면 품질을 낮춰 다시 인코딩한다 */
const QUALITY_STEPS = [COVER_LIMITS.quality, 0.6, 0.4];

export async function prepareCoverImage(file: File): Promise<PrepareCoverResult> {
  if (file.size > COVER_LIMITS.maxSourceBytes) {
    return {
      ok: false,
      message: `사진이 너무 커요. ${formatBytes(COVER_LIMITS.maxSourceBytes)} 이하 파일을 골라 주세요.`,
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, message: READ_FAILED };
  }

  try {
    const crop = cropTo4x3(bitmap.width, bitmap.height);
    // 원본보다 키우지는 않는다 — 작은 사진을 800px로 늘리면 화질만 나빠진다
    const width = Math.max(1, Math.min(COVER_LIMITS.targetWidth, Math.round(crop.sw)));
    const height = Math.max(
      1,
      Math.round((width * COVER_LIMITS.targetHeight) / COVER_LIMITS.targetWidth),
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, message: READ_FAILED };
    ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);

    for (const quality of QUALITY_STEPS) {
      const blob = await encode(canvas, quality);
      if (!blob) return { ok: false, message: READ_FAILED };
      // webp를 못 만드는 브라우저는 png로 떨어진다 — 서버가 받아 주는 형식인지만 확인한다
      const contentType = blob.type;
      if (!isCoverContentType(contentType)) return { ok: false, message: READ_FAILED };
      if (blob.size <= COVER_LIMITS.maxBytes) {
        return {
          ok: true,
          cover: { blob, contentType, width, height, previewUrl: URL.createObjectURL(blob) },
        };
      }
    }
    return {
      ok: false,
      message: `이미지를 ${formatBytes(COVER_LIMITS.maxBytes)} 아래로 줄이지 못했어요. 다른 사진을 골라 주세요.`,
    };
  } finally {
    bitmap.close();
  }
}

/** 미리보기 URL 해제 — 컴포넌트가 커버를 교체하거나 버릴 때 부른다 */
export function releaseCover(cover: PreparedCover | null): void {
  if (cover) URL.revokeObjectURL(cover.previewUrl);
}

/** 업로드에 실을 파일 — 서버는 이름·타입을 믿지 않지만 형식은 갖춰 보낸다 */
export function coverToFile(cover: PreparedCover): File {
  const extension = cover.contentType.replace("image/", "").replace("jpeg", "jpg");
  return new File([cover.blob], `cover.${extension}`, { type: cover.contentType });
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
  });
}

/** 가운데를 기준으로 4:3 영역을 잘라낸다 */
function cropTo4x3(
  width: number,
  height: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const ratio = COVER_LIMITS.targetWidth / COVER_LIMITS.targetHeight;
  if (width / height > ratio) {
    const sw = height * ratio;
    return { sx: (width - sw) / 2, sy: 0, sw, sh: height };
  }
  const sh = width / ratio;
  return { sx: 0, sy: (height - sh) / 2, sw: width, sh };
}
