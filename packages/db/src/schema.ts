import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Postgres `bytea` — drizzle-orm 기본 제공 타입이 없어 직접 정의한다.
 * 드라이버(node-postgres)가 Buffer <-> bytea 변환을 처리하므로 그대로 통과시킨다.
 */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const planEnum = pgEnum("plan", ["free", "pass"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const countryEnum = pgEnum("country", ["KR", "JP", "US"]);
export const plotVisibilityEnum = pgEnum("plot_visibility", ["public", "private"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);
export const noticeCategoryEnum = pgEnum("notice_category", ["공지", "업데이트", "이벤트"]);
export const experimentStatusEnum = pgEnum("experiment_status", ["running", "done"]);

/**
 * 유저 — 실가입 유저와 시드 유저(`isSeed`)가 한 테이블에 공존한다.
 * 시드 유저는 오피스 지표/목록의 표시 대상일 뿐 로그인할 수 없다(§seed).
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    /** bcrypt 해시. Google 전용 계정과 시드 유저는 로그인 불가 값이 들어간다 */
    passwordHash: text("password_hash"),
    googleSub: text("google_sub"),
    nickname: text("nickname").notNull(),
    plan: planEnum("plan").notNull().default("free"),
    hue: integer("hue").notNull().default(210),
    status: userStatusEnum("status").notNull().default("active"),
    country: countryEnum("country").notNull().default("KR"),
    isSeed: boolean("is_seed").notNull().default(false),
    /** 이하 3개는 시드 유저의 오피스 표시용 누적값 — 실사용분은 usage_events로 합산한다 */
    seedTurns: integer("seed_turns").notNull().default(0),
    seedTokensByModel: jsonb("seed_tokens_by_model")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    favoritePlotIds: text("favorite_plot_ids")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`),
    uniqueIndex("users_nickname_idx").on(t.nickname),
    uniqueIndex("users_google_sub_idx").on(t.googleSub),
  ],
);

/** 로그인 세션 — 쿠키에 담기는 랜덤 토큰이 곧 PK */
export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

/** 업로드된 커버 이미지 — 데모 규모라 bytea 직접 저장(T8 구현 노트 참고) */
export const images = pgTable("images", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  contentType: text("content_type").notNull(),
  bytes: bytea("bytes").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 플롯 — 시드 큐레이션 12개는 기존 문자열 id를 유지하고(URL 보존),
 * 유저 생성분은 서버가 uuid 문자열을 발급한다.
 */
export const plots = pgTable(
  "plots",
  {
    id: text("id").primaryKey(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    /** 비공개 설정 — 유저에게 노출하지 않는다 */
    persona: text("persona").notNull(),
    firstMessage: text("first_message").notNull(),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    emoji: text("emoji").notNull(),
    gradientFrom: text("gradient_from").notNull(),
    gradientTo: text("gradient_to").notNull(),
    coverImageId: uuid("cover_image_id").references(() => images.id, { onDelete: "set null" }),
    visibility: plotVisibilityEnum("visibility").notNull().default("public"),
    chatsCount: integer("chats_count").notNull().default(0),
    likesCount: integer("likes_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("plots_visibility_created_at_idx").on(t.visibility, t.createdAt),
    index("plots_tags_idx").using("gin", t.tags),
    index("plots_owner_id_idx").on(t.ownerId),
  ],
);

/** 유저 × 플롯 = 대화방 1개 */
export const chatRooms = pgTable(
  "chat_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plotId: text("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("chat_rooms_user_plot_idx").on(t.userId, t.plotId),
    index("chat_rooms_user_updated_idx").on(t.userId, t.updatedAt),
  ],
);

/** 메시지 — 방 안에서 seq 0부터 순차 채번(seq 0 = 플롯의 첫 메시지) */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => chatRooms.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    /** 스트리밍이 중단돼 부분만 저장된 응답 */
    interrupted: boolean("interrupted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("messages_room_seq_idx").on(t.roomId, t.seq)],
);

/** assistant 응답 1건 = 1행. 오피스 실사용 지표의 원천(추정 토큰) */
export const usageEvents = pgTable(
  "usage_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plotId: text("plot_id").references(() => plots.id, { onDelete: "set null" }),
    providerKind: text("provider_kind").notNull(),
    model: text("model").notNull(),
    estInputTokens: integer("est_input_tokens").notNull(),
    estOutputTokens: integer("est_output_tokens").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("usage_events_created_at_idx").on(t.createdAt),
    index("usage_events_user_id_idx").on(t.userId),
  ],
);

/** 90일 시드 지표 — 매출·GPU 비용 계열은 실데이터가 없어 시드 전용으로 남는다 */
export const dailyMetrics = pgTable("daily_metrics", {
  date: date("date").primaryKey(),
  dau: integer("dau").notNull(),
  newUsers: integer("new_users").notNull(),
  turns: integer("turns").notNull(),
  tokens: jsonb("tokens").$type<Record<string, { input: number; output: number }>>().notNull(),
  gpuCostKrw: integer("gpu_cost_krw").notNull(),
  revenueKrw: integer("revenue_krw").notNull(),
  feeKrw: integer("fee_krw").notNull(),
});

export const notices = pgTable(
  "notices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: noticeCategoryEnum("category").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notices_published_at_idx").on(t.publishedAt)],
);

/** A/B 실험 — 오피스에서 읽기 전용 */
export const experiments = pgTable("experiments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  hypothesis: text("hypothesis").notNull(),
  status: experimentStatusEnum("status").notNull(),
  startedAt: date("started_at").notNull(),
  endedAt: date("ended_at"),
  variants: jsonb("variants")
    .$type<
      {
        key: "A" | "B";
        label: string;
        users: number;
        d1Retention: number;
        turnsPerUser: number;
      }[]
    >()
    .notNull(),
  conclusion: text("conclusion"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Plot = typeof plots.$inferSelect;
export type NewPlot = typeof plots.$inferInsert;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type DailyMetricRow = typeof dailyMetrics.$inferSelect;
export type Notice = typeof notices.$inferSelect;
export type Experiment = typeof experiments.$inferSelect;
export type Image = typeof images.$inferSelect;
