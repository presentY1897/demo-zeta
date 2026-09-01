import { eq } from "drizzle-orm";
import { images, type Database } from "@theta/db";
import type { CoverContentType } from "@/lib/cover-limits";

export interface SaveImageInput {
  ownerId: string;
  contentType: CoverContentType;
  bytes: Buffer;
  width: number;
  height: number;
}

export interface StoredImage {
  id: string;
  contentType: string;
  bytes: Buffer;
  width: number;
  height: number;
}

/**
 * 이미지 저장 접근 — 라우트 핸들러는 이 인터페이스만 보고 DB를 모른다.
 *
 * 데모 조건(외부 서비스·env 키 없이 로컬 docker와 Neon에서 동일 동작)에서는 bytea 구현체를 쓰지만,
 * 실서비스라면 여기 뒤가 오브젝트 스토리지 + CDN으로 바뀐다. 교체 지점이 어디인지를 구조로 남겨 둔다.
 */
export interface ImageStore {
  save(input: SaveImageInput): Promise<string>;
  get(id: string): Promise<StoredImage | null>;
  /** 플롯에 연결할 때 타인 이미지를 막기 위한 소유자 조회 */
  findOwner(id: string): Promise<string | null>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** uuid가 아닌 값을 그대로 조회하면 Postgres가 타입 오류를 던진다 — 그 전에 걸러 404/400으로 답한다 */
export function isImageId(value: string): boolean {
  return UUID.test(value);
}

export function createDbImageStore(db: Database): ImageStore {
  return {
    async save(input) {
      const [row] = await db
        .insert(images)
        .values({
          ownerId: input.ownerId,
          contentType: input.contentType,
          bytes: input.bytes,
          width: input.width,
          height: input.height,
        })
        .returning({ id: images.id });
      return row!.id;
    },

    async get(id) {
      if (!isImageId(id)) return null;
      const rows = await db
        .select({
          id: images.id,
          contentType: images.contentType,
          bytes: images.bytes,
          width: images.width,
          height: images.height,
        })
        .from(images)
        .where(eq(images.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async findOwner(id) {
      if (!isImageId(id)) return null;
      const rows = await db
        .select({ ownerId: images.ownerId })
        .from(images)
        .where(eq(images.id, id))
        .limit(1);
      return rows[0]?.ownerId ?? null;
    },
  };
}
