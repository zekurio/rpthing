import {
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { realm } from "./realm";

export const realmMember = pgTable(
	"realm_member",
	{
		id: uuid("id")
			.primaryKey()
			.$defaultFn(() => Bun.randomUUIDv7()),
		realmId: text("realm_id")
			.notNull()
			.references(() => realm.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("realm_member_unique").on(table.realmId, table.userId),
	],
);
