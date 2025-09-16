import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { user } from "./auth";

// Realm acts as a universe container
export const realm = pgTable("realm", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid(7)),
	name: text("name").notNull(),
	description: text("description"),
	password: text("password"),
	iconKey: text("icon_key"),
	ownerId: uuid("owner_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});
