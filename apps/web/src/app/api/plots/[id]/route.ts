import { NextResponse } from "next/server";
import { db } from "@theta/db";
import { jsonError, readSessionToken } from "@/server/auth/http";
import { findSessionUser } from "@/server/auth/session";
import { getPlotForViewer } from "@/server/plots/queries";
import { deleteOwnedPlot } from "@/server/plots/mutations";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params): Promise<NextResponse> {
  const viewer = await findSessionUser(db, readSessionToken(req));
  const { id } = await params;
  const plot = await getPlotForViewer(db, id, viewer?.id ?? null);
  // 비공개 플롯은 존재 여부 자체를 감춘다 — 미존재와 같은 404
  if (!plot) return jsonError(404, "플롯을 찾을 수 없어요.");

  const { persona: _persona, ...publicFields } = plot;
  return NextResponse.json({ plot: publicFields });
}

export async function DELETE(req: Request, { params }: Params): Promise<NextResponse> {
  const viewer = await findSessionUser(db, readSessionToken(req));
  if (!viewer) return jsonError(401, "로그인이 필요해요.");

  const { id } = await params;
  const deleted = await deleteOwnedPlot(db, id, viewer.id);
  if (!deleted) return jsonError(403, "내가 만든 플롯만 삭제할 수 있어요.");
  return NextResponse.json({ ok: true });
}
