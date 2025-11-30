import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { realm } from "./realm";

export const character = pgTable("character", {
	id: uuid("id")
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	realmId: text("realm_id")
		.notNull()
		.references(() => realm.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	gender: text("gender"),
	referenceImageKey: text("reference_image_key"),
	croppedImageKey: text("cropped_image_key"),
	notes: text("notes"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});
