import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { jsonError } from "@/server/auth/http";
import { createDbImageStore } from "@/server/images/store";

export const runtime = "nodejs";

/**
 * 업로드된 이미지는 내용이 절대 바뀌지 않는다(교체는 새 id 발급) — 그래서 immutable 캐시를 건다.
 * 같은 이유로 ETag는 id 그대로면 충분하다.
 */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const image = await createDbImageStore(db).get(id);
  if (!image) return jsonError(404, "이미지를 찾을 수 없어요.");

  const etag = `"${image.id}"`;
  if (matchesEtag(req.headers.get("if-none-match"), etag)) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
    });
  }

  return new NextResponse(new Uint8Array(image.bytes), {
    status: 200,
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.bytes.byteLength),
      "Cache-Control": CACHE_CONTROL,
      ETag: etag,
    },
  });
}

function matchesEtag(header: string | null, etag: string): boolean {
  if (!header) return false;
  return header
    .split(",")
    .map((v) => v.trim().replace(/^W\//, ""))
    .some((v) => v === etag || v === "*");
}
