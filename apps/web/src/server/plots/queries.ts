import { and, desc, eq, or, sql } from "drizzle-orm";
import { plots, users, type Database } from "@theta/db";
import type { PlotView, PlotWithPersona } from "@/lib/plot-view";

const selection = {
  id: plots.id,
  ownerId: plots.ownerId,
  name: plots.name,
  tagline: plots.tagline,
  description: plots.description,
  persona: plots.persona,
  firstMessage: plots.firstMessage,
  tags: plots.tags,
  emoji: plots.emoji,
  gradientFrom: plots.gradientFrom,
  gradientTo: plots.gradientTo,
  visibility: plots.visibility,
  chatsCount: plots.chatsCount,
  likesCount: plots.likesCount,
  createdAt: plots.createdAt,
  creator: users.nickname,
} as const;

interface PlotRow {
  id: string;
  ownerId: string | null;
  name: string;
  tagline: string;
  description: string;
  persona: string;
  firstMessage: string;
  tags: string[];
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  visibility: "public" | "private";
  chatsCount: number;
  likesCount: number;
  createdAt: Date;
  /** leftJoin이라 소유자가 지워진 플롯은 null이 될 수 있다 */
  creator: string | null;
}

function toView(row: PlotRow, viewerId: string | null): PlotView {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    firstMessage: row.firstMessage,
    tags: row.tags,
    emoji: row.emoji,
    gradient: [row.gradientFrom, row.gradientTo],
    creator: row.creator ?? "알 수 없음",
    chats: row.chatsCount,
    likes: row.likesCount,
    visibility: row.visibility,
    mine: viewerId !== null && row.ownerId === viewerId,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

/**
 * 홈 피드 — 공개 플롯 전체 + (로그인 시) 본인 비공개 플롯.
 * 정렬은 내 플롯 우선, 그 다음 대화수 내림차순(기존 화면 동작 유지).
 * 데모 규모(수십~수백)라 페이징 없이 전부 돌려준다.
 */
export async function listPlots(
  db: Database,
  options: { viewerId: string | null; tag?: string | null },
): Promise<PlotView[]> {
  const visible = options.viewerId
    ? or(eq(plots.visibility, "public"), eq(plots.ownerId, options.viewerId))
    : eq(plots.visibility, "public");

  const tagFilter = options.tag ? sql`${plots.tags} @> ARRAY[${options.tag}]::text[]` : undefined;

  const rows = await db
    .select(selection)
    .from(plots)
    .leftJoin(users, eq(plots.ownerId, users.id))
    .where(tagFilter ? and(visible, tagFilter) : visible)
    .orderBy(desc(plots.chatsCount), desc(plots.createdAt));

  const views = rows.map((row) => toView(row, options.viewerId));
  // 내 플롯을 앞으로 (SQL 정렬 위에 안정 정렬로 얹는다)
  return [...views.filter((p) => p.mine), ...views.filter((p) => !p.mine)];
}

/** 소유자만 볼 수 있는 비공개 플롯은 존재 여부를 드러내지 않도록 null을 돌려준다 */
export async function getPlotForViewer(
  db: Database,
  id: string,
  viewerId: string | null,
): Promise<PlotWithPersona | null> {
  const rows = await db
    .select(selection)
    .from(plots)
    .leftJoin(users, eq(plots.ownerId, users.id))
    .where(eq(plots.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.visibility === "private" && row.ownerId !== viewerId) return null;

  return { ...toView(row, viewerId), persona: row.persona };
}

/** 내가 만든 플롯 — 비공개 포함, 최신순 */
export async function listOwnedPlots(db: Database, ownerId: string): Promise<PlotView[]> {
  const rows = await db
    .select(selection)
    .from(plots)
    .leftJoin(users, eq(plots.ownerId, users.id))
    .where(eq(plots.ownerId, ownerId))
    .orderBy(desc(plots.createdAt));
  return rows.map((row) => toView(row, ownerId));
}
