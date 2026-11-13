CREATE TABLE `form_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`type` text NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`options` text,
	`help_text` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD `answers` text;--> statement-breakpoint
ALTER TABLE `shops` ADD `phone_field` text DEFAULT 'required' NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `email_field` text DEFAULT 'optional' NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `notes_field` text DEFAULT 'optional' NOT NULL;