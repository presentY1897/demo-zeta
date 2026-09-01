import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { jsonError, readSessionToken } from "@/server/auth/http";
import { findSessionUser } from "@/server/auth/session";
import { listPlots } from "@/server/plots/queries";
import { createPlot } from "@/server/plots/mutations";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const viewer = await findSessionUser(db, readSessionToken(req));
  const tag = new URL(req.url).searchParams.get("tag");
  const plots = await listPlots(db, { viewerId: viewer?.id ?? null, tag });
  return NextResponse.json({ plots });
}

export async function POST(req: Request): Promise<NextResponse> {
  const viewer = await findSessionUser(db, readSessionToken(req));
  if (!viewer) return jsonError(401, "로그인이 필요해요.");
  if (viewer.status === "suspended") return jsonError(403, "제재된 계정은 플롯을 만들 수 없어요.");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "요청 형식이 올바르지 않아요.");
  }

  const result = await createPlot(db, viewer.id, body as never);
  if (!result.ok) return jsonError(result.status, result.message);
  return NextResponse.json({ id: result.id }, { status: 201 });
}
