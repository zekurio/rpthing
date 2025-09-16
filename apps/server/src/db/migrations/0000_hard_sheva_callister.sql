CREATE TYPE "public"."trait_display_mode" AS ENUM('number', 'grade');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character" (
	"id" uuid PRIMARY KEY NOT NULL,
	"realm_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"gender" text,
	"reference_image_key" text,
	"cropped_image_key" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "realm" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"password" text,
	"icon_key" text,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_trait_rating" (
	"id" uuid PRIMARY KEY NOT NULL,
	"character_id" uuid NOT NULL,
	"trait_id" uuid NOT NULL,
	"value" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trait" (
	"id" uuid PRIMARY KEY NOT NULL,
	"realm_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"display_mode" "trait_display_mode" DEFAULT 'grade' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character" ADD CONSTRAINT "character_realm_id_realm_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realm"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character" ADD CONSTRAINT "character_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realm" ADD CONSTRAINT "realm_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_trait_rating" ADD CONSTRAINT "character_trait_rating_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_trait_rating" ADD CONSTRAINT "character_trait_rating_trait_id_trait_id_fk" FOREIGN KEY ("trait_id") REFERENCES "public"."trait"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trait" ADD CONSTRAINT "trait_realm_id_realm_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realm"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ctr_character_trait_unique" ON "character_trait_rating" USING btree ("character_id","trait_id");--> statement-breakpoint
CREATE INDEX "ctr_character_id_idx" ON "character_trait_rating" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "ctr_trait_id_idx" ON "character_trait_rating" USING btree ("trait_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trait_realm_id_name_unique" ON "trait" USING btree ("realm_id","name");--> statement-breakpoint
CREATE INDEX "trait_realm_id_idx" ON "trait" USING btree ("realm_id");