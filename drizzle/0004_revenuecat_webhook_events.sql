CREATE TABLE `revenuecat_webhook_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` varchar(191) NOT NULL,
  `appUserId` varchar(191),
  `eventType` varchar(64),
  `eventTimestampMs` bigint,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `revenuecat_webhook_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revenuecat_webhook_events_event_id_unique` ON `revenuecat_webhook_events` (`eventId`);
--> statement-breakpoint
CREATE INDEX `revenuecat_webhook_events_app_user_idx` ON `revenuecat_webhook_events` (`appUserId`);
