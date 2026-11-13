CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`name` text NOT NULL,
	`prefix` text NOT NULL,
	`hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_hash_unique` ON `api_keys` (`hash`);--> statement-breakpoint
CREATE TABLE `webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint_id` text NOT NULL,
	`shop_id` text NOT NULL,
	`event_id` text NOT NULL,
	`event` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer,
	`last_status_code` integer,
	`last_error` text,
	`created_at` integer NOT NULL,
	`delivered_at` integer,
	FOREIGN KEY (`endpoint_id`) REFERENCES `webhook_endpoints`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhook_deliveries_due` ON `webhook_deliveries` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `webhook_endpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`url` text NOT NULL,
	`secret` text NOT NULL,
	`events` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
