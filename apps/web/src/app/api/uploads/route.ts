import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { COVER_LIMITS, formatBytes } from "@/lib/cover-limits";
import { jsonError, readSessionToken } from "@/server/auth/http";
import { findSessionUser } from "@/server/auth/session";
import { inspectImage } from "@/server/images/sniff";
import { createDbImageStore } from "@/server/images/store";

export const runtime = "nodejs";

/** multipart 경계·헤더가 붙는 만큼의 여유 — 본문을 파싱하기 전 크기를 거를 때 쓴다 */
const MULTIPART_OVERHEAD = 8 * 1024;

const TOO_LARGE = `이미지는 ${formatBytes(COVER_LIMITS.maxBytes)}까지 올릴 수 있어요.`;
const NOT_IMAGE = "이미지 파일이 아니에요. JPG·PNG·WebP 파일을 올려 주세요.";

/**
 * 커버 이미지 업로드. 응답은 `{ id }`뿐이고, 실제 표시는 `GET /api/images/[id]`가 맡는다.
 * 확장자·Content-Type을 믿지 않고 매직 바이트로 판정한다(가짜 확장자 거부).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const viewer = await findSessionUser(db, readSessionToken(req));
  if (!viewer) return jsonError(401, "로그인이 필요해요.");
  if (viewer.status === "suspended")
    return jsonError(403, "제재된 계정은 이미지를 올릴 수 없어요.");

  // 본문 전체를 메모리에 올리기 전에 선언된 길이로 먼저 거른다
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > COVER_LIMITS.maxBytes + MULTIPART_OVERHEAD)
    return jsonError(413, TOO_LARGE);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "이미지 파일을 찾지 못했어요.");
  }

  const file = form.get("file");
  if (!file || typeof file === "string") return jsonError(400, "이미지 파일을 찾지 못했어요.");
  if (file.size > COVER_LIMITS.maxBytes) return jsonError(413, TOO_LARGE);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength === 0) return jsonError(400, "빈 파일이에요.");
  if (bytes.byteLength > COVER_LIMITS.maxBytes) return jsonError(413, TOO_LARGE);

  const info = inspectImage(bytes);
  if (!info) return jsonError(400, NOT_IMAGE);
  if (info.width > COVER_LIMITS.maxEdge || info.height > COVER_LIMITS.maxEdge)
    return jsonError(
      400,
      `이미지가 너무 커요. 가로·세로 ${COVER_LIMITS.maxEdge}px 이하로 올려 주세요.`,
    );

  const id = await createDbImageStore(db).save({
    ownerId: viewer.id,
    contentType: info.contentType,
    bytes,
    width: info.width,
    height: info.height,
  });
  return NextResponse.json({ id }, { status: 201 });
}
