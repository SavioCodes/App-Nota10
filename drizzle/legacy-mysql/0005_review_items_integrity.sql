DELETE ri_newer
FROM review_items AS ri_newer
INNER JOIN review_items AS ri_older
  ON ri_newer.userId = ri_older.userId
 AND ri_newer.artifactId = ri_older.artifactId
 AND ri_newer.id > ri_older.id;
--> statement-breakpoint
CREATE UNIQUE INDEX `review_items_user_artifact_unique`
ON `review_items` (`userId`, `artifactId`);
--> statement-breakpoint
CREATE INDEX `review_items_user_next_review_idx`
ON `review_items` (`userId`, `nextReviewAt`);
--> statement-breakpoint
CREATE INDEX `review_items_user_document_idx`
ON `review_items` (`userId`, `documentId`);
