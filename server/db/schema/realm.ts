import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";
import { user } from "./auth";

// Custom alphabet for realm IDs: letters and numbers only (no underscores or hyphens)
const realmIdAlphabet =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const generateRealmId = customAlphabet(realmIdAlphabet, 7);

// Realm acts as a universe container
export const realm = pgTable("realm", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => generateRealmId()),
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
