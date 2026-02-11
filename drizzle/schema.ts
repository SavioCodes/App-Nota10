import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar, float, json, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  subscriptionPlan: mysqlEnum("subscriptionPlan", ["free", "pro", "pro_enem"]).default("free").notNull(),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  plan: mysqlEnum("plan", ["free", "pro", "pro_enem"]).notNull(),
  status: mysqlEnum("status", ["active", "trialing", "billing_issue", "canceled", "expired"]).notNull().default("active"),
  expiresAt: timestamp("expiresAt"),
  revenueCatId: varchar("revenueCatId", { length: 191 }).notNull(),
  productId: varchar("productId", { length: 191 }),
  entitlementId: varchar("entitlementId", { length: 191 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("subscriptions_user_idx").on(table.userId),
  revenueCatUnique: uniqueIndex("subscriptions_revenuecat_unique").on(table.revenueCatId),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const usageCounters = mysqlTable("usage_counters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  conversionCount: int("conversionCount").default(0).notNull(),
}, (table) => ({
  userDateUnique: uniqueIndex("usage_counters_user_date_unique").on(table.userId, table.date),
}));

export type UsageCounter = typeof usageCounters.$inferSelect;

export const folders = mysqlTable("folders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  folderId: int("folderId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  originalFileUrl: varchar("originalFileUrl", { length: 1024 }).notNull(),
  extractedText: text("extractedText"),
  ocrConfidence: mysqlEnum("ocrConfidence", ["high", "medium", "low"]),
  status: mysqlEnum("status", ["uploading", "extracting", "generating", "ready", "error"]).default("uploading").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export const chunks = mysqlTable("chunks", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  chunkOrder: int("chunkOrder").notNull(),
  textContent: text("textContent").notNull(),
});

export type Chunk = typeof chunks.$inferSelect;

export const artifacts = mysqlTable("artifacts", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  type: mysqlEnum("type", ["summary", "content_map", "flashcard", "question"]).notNull(),
  content: json("content").notNull(),
  sourceChunkIds: json("sourceChunkIds").notNull(),
  mode: mysqlEnum("mode", ["faithful", "deepened", "exam"]).default("faithful").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Artifact = typeof artifacts.$inferSelect;

export const reviewItems = mysqlTable("review_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  artifactId: int("artifactId").notNull(),
  documentId: int("documentId").notNull(),
  nextReviewAt: timestamp("nextReviewAt").notNull(),
  easeFactor: float("easeFactor").default(2.5).notNull(),
  interval: int("interval").default(1).notNull(),
  streak: int("streak").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReviewItem = typeof reviewItems.$inferSelect;
