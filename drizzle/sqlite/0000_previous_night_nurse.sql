CREATE TABLE `allocations` (
	`row_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`order_id` text NOT NULL,
	`week` integer NOT NULL,
	`hours` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assumption_versions` (
	`row_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`version` integer NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `av_owner_ver` ON `assumption_versions` (`owner_id`,`version`);--> statement-breakpoint
CREATE TABLE `owners` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `parts` (
	`row_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`part_id` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quote_revisions` (
	`row_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quote_id` text NOT NULL,
	`rev` integer NOT NULL,
	`assumptions_version` integer NOT NULL,
	`committed_load_at_pricing` real NOT NULL,
	`part` text NOT NULL,
	`result` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `qr_quote_rev` ON `quote_revisions` (`quote_id`,`rev`);--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`number` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`accepted_seq` integer,
	`committed_hours` real
);
