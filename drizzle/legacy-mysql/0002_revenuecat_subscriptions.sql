CREATE TABLE `subscriptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `plan` enum('free','pro','pro_enem') NOT NULL,
  `status` enum('active','trialing','billing_issue','canceled','expired') NOT NULL DEFAULT 'active',
  `expiresAt` timestamp,
  `revenueCatId` varchar(191) NOT NULL,
  `productId` varchar(191),
  `entitlementId` varchar(191),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`userId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_revenuecat_unique` ON `subscriptions` (`revenueCatId`);
--> statement-breakpoint
DELETE t1 FROM `usage_counters` t1
INNER JOIN `usage_counters` t2
  ON t1.`userId` = t2.`userId`
 AND t1.`date` = t2.`date`
 AND t1.`id` > t2.`id`;
--> statement-breakpoint
ALTER TABLE `usage_counters`
ADD CONSTRAINT `usage_counters_user_date_unique` UNIQUE(`userId`, `date`);
