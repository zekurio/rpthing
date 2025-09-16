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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_trait_rating" ADD CONSTRAINT "character_trait_rating_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_trait_rating" ADD CONSTRAINT "character_trait_rating_trait_id_trait_id_fk" FOREIGN KEY ("trait_id") REFERENCES "public"."trait"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trait" ADD CONSTRAINT "trait_realm_id_realm_id_fk" FOREIGN KEY ("realm_id") REFERENCES "public"."realm"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ctr_character_trait_unique" ON "character_trait_rating" USING btree ("character_id","trait_id");--> statement-breakpoint
CREATE INDEX "ctr_character_id_idx" ON "character_trait_rating" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "ctr_trait_id_idx" ON "character_trait_rating" USING btree ("trait_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trait_realm_id_name_unique" ON "trait" USING btree ("realm_id","name");--> statement-breakpoint
CREATE INDEX "trait_realm_id_idx" ON "trait" USING btree ("realm_id");