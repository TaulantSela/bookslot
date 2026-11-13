CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`service_ids` text,
	`use_shop_hours` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD `staff_id` text REFERENCES staff(id);--> statement-breakpoint
ALTER TABLE `date_overrides` ADD `staff_id` text REFERENCES staff(id);--> statement-breakpoint
ALTER TABLE `shops` ADD `staff_label` text DEFAULT 'Staff member' NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `staff_choice` text DEFAULT 'choose' NOT NULL;--> statement-breakpoint
ALTER TABLE `working_hours` ADD `staff_id` text REFERENCES staff(id);