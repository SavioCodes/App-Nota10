ALTER TABLE `documents`
ADD `textHash` varchar(64);
--> statement-breakpoint
ALTER TABLE `chunks`
ADD `startOffset` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `chunks`
ADD `endOffset` int NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `chunks`
SET `endOffset` = CHAR_LENGTH(`textContent`)
WHERE `endOffset` = 0;
--> statement-breakpoint
CREATE UNIQUE INDEX `chunks_document_order_unique` ON `chunks` (`documentId`, `chunkOrder`);
--> statement-breakpoint
ALTER TABLE `artifacts`
ADD `sourceHash` varchar(64);
--> statement-breakpoint
CREATE INDEX `artifacts_document_mode_hash_idx` ON `artifacts` (`documentId`, `mode`, `sourceHash`);
