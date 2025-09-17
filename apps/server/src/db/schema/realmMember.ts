import {
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { realm } from "./realm";

export const realmMemberRoleEnum = pgEnum("realm_member_role", [
	"owner",
	"admin",
	"member",
]);

export const realmMember = pgTable(
	"realm_member",
	{
		id: uuid("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		realmId: text("realm_id")
			.notNull()
			.references(() => realm.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: realmMemberRoleEnum("role").notNull().default("member"),
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
