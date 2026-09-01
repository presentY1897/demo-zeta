import type { Metadata } from "next";
import { db } from "@theta/db";
import { PlotNotFound } from "@/components/PlotNotFound";
import { PlotProfileView } from "@/components/PlotProfileView";
import { getCurrentUser } from "@/server/auth/current-user";
import { getPlotForViewer } from "@/server/plots/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  const plot = await getPlotForViewer(db, id, user?.id ?? null);
  return { title: plot?.name ?? "플롯" };
}

export default async function PlotProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const plot = await getPlotForViewer(db, id, user?.id ?? null);
  // 비공개 플롯을 남이 열면 미존재와 구분되지 않는 화면을 보여준다
  if (!plot) return <PlotNotFound />;

  return <PlotProfileView plot={plot} />;
}
