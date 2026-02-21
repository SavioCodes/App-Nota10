import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["free", "pro", "pro_enem"]);
export const authProviderEnum = pgEnum("auth_provider", ["supabase_google", "supabase_apple", "legacy_oauth"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "billing_issue",
  "canceled",
  "expired",
]);
export const subscriptionProviderEnum = pgEnum("subscription_provider", [
  "app_store",
  "google_play",
  "mercado_pago",
]);
export const ocrConfidenceEnum = pgEnum("ocr_confidence", ["high", "medium", "low"]);
export const documentStatusEnum = pgEnum("document_status", [
  "uploading",
  "extracting",
  "generating",
  "ready",
  "error",
]);
export const artifactTypeEnum = pgEnum("artifact_type", ["summary", "content_map", "flashcard", "question"]);
export const artifactModeEnum = pgEnum("artifact_mode", ["faithful", "deepened", "exam"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 191 }).notNull().unique(),
  supabaseUserId: varchar("supabaseUserId", { length: 191 }).unique(),
  authProvider: authProviderEnum("authProvider"),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  subscriptionPlan: subscriptionPlanEnum("subscriptionPlan").default("free").notNull(),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    plan: subscriptionPlanEnum("plan").notNull(),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    provider: subscriptionProviderEnum("provider").notNull().default("mercado_pago"),
    providerSubscriptionId: varchar("providerSubscriptionId", { length: 191 }).notNull(),
    providerCustomerId: varchar("providerCustomerId", { length: 191 }),
    revenueCatId: varchar("revenueCatId", { length: 191 }),
    productId: varchar("productId", { length: 191 }),
    entitlementId: varchar("entitlementId", { length: 191 }),
    expiresAt: timestamp("expiresAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("subscriptions_user_idx").on(table.userId),
    providerSubUnique: uniqueIndex("subscriptions_provider_subscription_unique").on(
      table.provider,
      table.providerSubscriptionId,
    ),
    revenueCatUnique: uniqueIndex("subscriptions_revenuecat_unique").on(table.revenueCatId),
  }),
);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const revenueCatWebhookEvents = pgTable(
  "revenuecat_webhook_events",
  {
    id: serial("id").primaryKey(),
    eventId: varchar("eventId", { length: 191 }).notNull(),
    appUserId: varchar("appUserId", { length: 191 }),
    eventType: varchar("eventType", { length: 64 }),
    eventTimestampMs: bigint("eventTimestampMs", { mode: "number" }),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdUnique: uniqueIndex("revenuecat_webhook_events_event_id_unique").on(table.eventId),
    appUserIdx: index("revenuecat_webhook_events_app_user_idx").on(table.appUserId),
  }),
);

export type RevenueCatWebhookEvent = typeof revenueCatWebhookEvents.$inferSelect;
export type InsertRevenueCatWebhookEvent = typeof revenueCatWebhookEvents.$inferInsert;

export const billingWebhookEvents = pgTable(
  "billing_webhook_events",
  {
    id: serial("id").primaryKey(),
    provider: subscriptionProviderEnum("provider").notNull(),
    eventId: varchar("eventId", { length: 191 }).notNull(),
    eventType: varchar("eventType", { length: 64 }),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    providerEventUnique: uniqueIndex("billing_webhook_events_provider_event_unique").on(
      table.provider,
      table.eventId,
    ),
  }),
);

export type BillingWebhookEvent = typeof billingWebhookEvents.$inferSelect;

export const usageCounters = pgTable(
  "usage_counters",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    conversionCount: integer("conversionCount").default(0).notNull(),
  },
  (table) => ({
    userDateUnique: uniqueIndex("usage_counters_user_date_unique").on(table.userId, table.date),
  }),
);

export type UsageCounter = typeof usageCounters.$inferSelect;

export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  folderId: integer("folderId").notNull(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  originalFileUrl: varchar("originalFileUrl", { length: 1024 }).notNull(),
  originalFileKey: varchar("originalFileKey", { length: 1024 }),
  extractedText: text("extractedText"),
  textHash: varchar("textHash", { length: 64 }),
  ocrConfidence: ocrConfidenceEnum("ocrConfidence"),
  status: documentStatusEnum("status").default("uploading").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export const chunks = pgTable(
  "chunks",
  {
    id: serial("id").primaryKey(),
    documentId: integer("documentId").notNull(),
    chunkOrder: integer("chunkOrder").notNull(),
    textContent: text("textContent").notNull(),
    startOffset: integer("startOffset").notNull(),
    endOffset: integer("endOffset").notNull(),
  },
  (table) => ({
    documentOrderUnique: uniqueIndex("chunks_document_order_unique").on(table.documentId, table.chunkOrder),
  }),
);

export type Chunk = typeof chunks.$inferSelect;

export const artifacts = pgTable("artifacts", {
  id: serial("id").primaryKey(),
  documentId: integer("documentId").notNull(),
  type: artifactTypeEnum("type").notNull(),
  content: jsonb("content").notNull(),
  sourceChunkIds: jsonb("sourceChunkIds").notNull(),
  sourceHash: varchar("sourceHash", { length: 64 }),
  mode: artifactModeEnum("mode").default("faithful").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Artifact = typeof artifacts.$inferSelect;

export const reviewItems = pgTable(
  "review_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    artifactId: integer("artifactId").notNull(),
    documentId: integer("documentId").notNull(),
    nextReviewAt: timestamp("nextReviewAt", { withTimezone: true }).notNull(),
    easeFactor: real("easeFactor").default(2.5).notNull(),
    interval: integer("interval").default(1).notNull(),
    streak: integer("streak").default(0).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userArtifactUnique: uniqueIndex("review_items_user_artifact_unique").on(table.userId, table.artifactId),
    userNextReviewIdx: index("review_items_user_next_review_idx").on(table.userId, table.nextReviewAt),
    userDocumentIdx: index("review_items_user_document_idx").on(table.userId, table.documentId),
  }),
);

export type ReviewItem = typeof reviewItems.$inferSelect;
