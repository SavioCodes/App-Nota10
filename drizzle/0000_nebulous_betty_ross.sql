CREATE TYPE "public"."artifact_mode" AS ENUM('faithful', 'deepened', 'exam');--> statement-breakpoint
CREATE TYPE "public"."artifact_type" AS ENUM('summary', 'content_map', 'flashcard', 'question');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('supabase_google', 'supabase_apple', 'legacy_oauth');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('uploading', 'extracting', 'generating', 'ready', 'error');--> statement-breakpoint
CREATE TYPE "public"."ocr_confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'pro', 'pro_enem');--> statement-breakpoint
CREATE TYPE "public"."subscription_provider" AS ENUM('app_store', 'google_play', 'mercado_pago');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trialing', 'billing_issue', 'canceled', 'expired');--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"documentId" integer NOT NULL,
	"type" "artifact_type" NOT NULL,
	"content" jsonb NOT NULL,
	"sourceChunkIds" jsonb NOT NULL,
	"sourceHash" varchar(64),
	"mode" "artifact_mode" DEFAULT 'faithful' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" "subscription_provider" NOT NULL,
	"eventId" varchar(191) NOT NULL,
	"eventType" varchar(64),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"documentId" integer NOT NULL,
	"chunkOrder" integer NOT NULL,
	"textContent" text NOT NULL,
	"startOffset" integer NOT NULL,
	"endOffset" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"folderId" integer NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"originalFileUrl" varchar(1024) NOT NULL,
	"originalFileKey" varchar(1024),
	"extractedText" text,
	"textHash" varchar(64),
	"ocrConfidence" "ocr_confidence",
	"status" "document_status" DEFAULT 'uploading' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"artifactId" integer NOT NULL,
	"documentId" integer NOT NULL,
	"nextReviewAt" timestamp with time zone NOT NULL,
	"easeFactor" real DEFAULT 2.5 NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"plan" "subscription_plan" NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"provider" "subscription_provider" DEFAULT 'mercado_pago' NOT NULL,
	"providerSubscriptionId" varchar(191) NOT NULL,
	"providerCustomerId" varchar(191),
	"productId" varchar(191),
	"entitlementId" varchar(191),
	"expiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"date" date NOT NULL,
	"conversionCount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(191) NOT NULL,
	"supabaseUserId" varchar(191),
	"authProvider" "auth_provider",
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"subscriptionPlan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"subscriptionExpiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_supabaseUserId_unique" UNIQUE("supabaseUserId")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_webhook_events_provider_event_unique" ON "billing_webhook_events" USING btree ("provider","eventId");--> statement-breakpoint
CREATE UNIQUE INDEX "chunks_document_order_unique" ON "chunks" USING btree ("documentId","chunkOrder");--> statement-breakpoint
CREATE UNIQUE INDEX "review_items_user_artifact_unique" ON "review_items" USING btree ("userId","artifactId");--> statement-breakpoint
CREATE INDEX "review_items_user_next_review_idx" ON "review_items" USING btree ("userId","nextReviewAt");--> statement-breakpoint
CREATE INDEX "review_items_user_document_idx" ON "review_items" USING btree ("userId","documentId");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_subscription_unique" ON "subscriptions" USING btree ("provider","providerSubscriptionId");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_counters_user_date_unique" ON "usage_counters" USING btree ("userId","date");