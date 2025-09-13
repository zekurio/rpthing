CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT '"2025-09-13T08:41:50.392Z"' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT '"2025-09-13T08:41:50.391Z"' NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT '"2025-09-13T08:41:50.391Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2025-09-13T08:41:50.391Z"' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT '"2025-09-13T08:41:50.392Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2025-09-13T08:41:50.392Z"' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `character` (
	`id` text PRIMARY KEY NOT NULL,
	`realm_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`gender` text,
	`reference_image_key` text,
	`image_crop` text,
	`notes` text,
	`created_at` integer DEFAULT '"2025-09-13T08:41:50.398Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2025-09-13T08:41:50.398Z"' NOT NULL,
	FOREIGN KEY (`realm_id`) REFERENCES `realm`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `character_permission` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`field` text NOT NULL,
	`granted_to_user_id` text NOT NULL,
	`can_edit` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT '"2025-09-13T08:41:50.399Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2025-09-13T08:41:50.399Z"' NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `character`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_to_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `character_rating` (
	`character_id` text NOT NULL,
	`category_id` text NOT NULL,
	`value` integer NOT NULL,
	`created_at` integer DEFAULT '"2025-09-13T08:41:50.399Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2025-09-13T08:41:50.399Z"' NOT NULL,
	PRIMARY KEY(`character_id`, `category_id`),
	FOREIGN KEY (`character_id`) REFERENCES `character`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `rating_category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rating_category` (
	`id` text PRIMARY KEY NOT NULL,
	`realm_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT '"2025-09-13T08:41:50.398Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2025-09-13T08:41:50.398Z"' NOT NULL,
	FOREIGN KEY (`realm_id`) REFERENCES `realm`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `realm` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`password` text,
	`icon_key` text,
	`owner_id` text NOT NULL,
	`created_at` integer DEFAULT '"2025-09-13T08:41:50.398Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2025-09-13T08:41:50.398Z"' NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `realm_member` (
	`realm_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer DEFAULT '"2025-09-13T08:41:50.398Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2025-09-13T08:41:50.398Z"' NOT NULL,
	PRIMARY KEY(`realm_id`, `user_id`),
	FOREIGN KEY (`realm_id`) REFERENCES `realm`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
