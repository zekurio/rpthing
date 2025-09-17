CREATE TYPE "public"."character_permission_scope" AS ENUM('profile', 'image', 'ratings');--> statement-breakpoint
CREATE TABLE "character_permission" (
	"id" uuid PRIMARY KEY NOT NULL,
	"character_id" uuid NOT NULL,
	"grantee_user_id" uuid NOT NULL,
	"scope" character_permission_scope NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_permission" ADD CONSTRAINT "character_permission_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_permission" ADD CONSTRAINT "character_permission_grantee_user_id_user_id_fk" FOREIGN KEY ("grantee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "character_permission_unique" ON "character_permission" USING btree ("character_id","grantee_user_id","scope");--> statement-breakpoint
CREATE INDEX "character_permission_character_id_idx" ON "character_permission" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "character_permission_grantee_user_id_idx" ON "character_permission" USING btree ("grantee_user_id");