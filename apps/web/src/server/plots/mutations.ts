import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { plots, type Database } from "@theta/db";
import { LIMITS, MAX_TAGS } from "@/lib/plot-limits";
import { createDbImageStore } from "@/server/images/store";

export interface CreatePlotInput {
  name: string;
  tagline: string;
  description: string;
  persona: string;
  firstMessage: string;
  tags: string[];
  emoji: string;
  gradient: [string, string];
  /** `POST /api/uploads`가 발급한 id. 없으면 이모지 + 그라디언트 폴백 */
  coverImageId?: string | null;
  visibility: "public" | "private";
}

export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; status: number; message: string };

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

const COVER_NOT_MINE = "내가 올린 커버 이미지만 연결할 수 있어요.";

/** 위저드가 보내는 값이라도 서버에서 다시 검증한다 — 클라이언트 검증은 UX용일 뿐 */
export function validateCreateInput(input: Partial<CreatePlotInput>): string | null {
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const checks: [string, string, number][] = [
    ["캐릭터 이름", text(input.name), LIMITS.name],
    ["한 줄 소개", text(input.tagline), LIMITS.tagline],
    ["세계관 소개", text(input.description), LIMITS.description],
    ["성격·말투 설정", text(input.persona), LIMITS.persona],
    ["첫 메시지", text(input.firstMessage), LIMITS.firstMessage],
  ];
  for (const [label, value, max] of checks) {
    if (!value) return `${label}을(를) 입력해 주세요.`;
    if (value.length > max) return `${label}은(는) ${max}자까지 쓸 수 있어요.`;
  }

  if (!Array.isArray(input.tags) || input.tags.length === 0) return "태그를 1개 이상 선택해 주세요.";
  if (input.tags.length > MAX_TAGS) return `태그는 최대 ${MAX_TAGS}개까지예요.`;
  for (const tag of input.tags) {
    if (typeof tag !== "string" || !tag.trim()) return "빈 태그는 넣을 수 없어요.";
    if (tag.length > LIMITS.tag) return `태그는 ${LIMITS.tag}자까지예요.`;
  }

  if (typeof input.emoji !== "string" || input.emoji.length === 0 || input.emoji.length > 8)
    return "커버 이모지를 선택해 주세요.";

  const gradient = input.gradient;
  if (
    !Array.isArray(gradient) ||
    gradient.length !== 2 ||
    !gradient.every((c) => typeof c === "string" && HEX_COLOR.test(c))
  )
    return "커버 색상을 선택해 주세요.";

  if (input.visibility !== "public" && input.visibility !== "private")
    return "공개 설정을 선택해 주세요.";

  const cover = input.coverImageId;
  if (cover !== undefined && cover !== null && typeof cover !== "string")
    return COVER_NOT_MINE;

  return null;
}

export async function createPlot(
  db: Database,
  ownerId: string,
  input: CreatePlotInput,
): Promise<CreateResult> {
  const error = validateCreateInput(input);
  if (error) return { ok: false, status: 400, message: error };

  // 남이 올린 이미지를 내 플롯 커버로 붙이지 못하게 막는다.
  // 없는 id와 타인 id의 응답을 같게 두어 이미지 존재 여부도 새지 않게 한다.
  const coverImageId = typeof input.coverImageId === "string" ? input.coverImageId.trim() : "";
  if (coverImageId) {
    const owner = await createDbImageStore(db).findOwner(coverImageId);
    if (owner !== ownerId) return { ok: false, status: 400, message: COVER_NOT_MINE };
  }

  // u- 로컬 id 체계는 폐기 — 서버가 uuid를 발급한다
  const id = randomUUID();
  await db.insert(plots).values({
    id,
    ownerId,
    name: input.name.trim(),
    tagline: input.tagline.trim(),
    description: input.description.trim(),
    persona: input.persona.trim(),
    firstMessage: input.firstMessage.trim(),
    tags: input.tags.map((t) => t.trim()),
    emoji: input.emoji,
    gradientFrom: input.gradient[0],
    gradientTo: input.gradient[1],
    coverImageId: coverImageId || null,
    visibility: input.visibility,
  });
  return { ok: true, id };
}

/** 소유자만 삭제할 수 있다. 대화방·메시지는 FK cascade로 함께 정리된다 */
export async function deleteOwnedPlot(
  db: Database,
  id: string,
  ownerId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(plots)
    .where(and(eq(plots.id, id), eq(plots.ownerId, ownerId)))
    .returning({ id: plots.id });
  return deleted.length > 0;
}
