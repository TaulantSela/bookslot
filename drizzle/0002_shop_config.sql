CREATE TABLE `date_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`label` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD `buffer_minutes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `buffer_minutes` integer;--> statement-breakpoint
ALTER TABLE `shops` ADD `currency` text DEFAULT 'MKD' NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `slot_interval_minutes` integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `buffer_minutes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `min_notice_minutes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `max_advance_days` integer DEFAULT 90 NOT NULL;