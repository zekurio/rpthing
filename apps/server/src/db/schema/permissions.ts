import {
	index,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { character } from "./character";

export const characterPermissionScopeEnum = pgEnum(
	"character_permission_scope",
	["profile", "image", "ratings"],
);

export const characterPermission = pgTable(
	"character_permission",
	{
		id: uuid("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		characterId: uuid("character_id")
			.notNull()
			.references(() => character.id, { onDelete: "cascade" }),
		granteeUserId: uuid("grantee_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		scope: characterPermissionScopeEnum("scope").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("character_permission_unique").on(
			table.characterId,
			table.granteeUserId,
			table.scope,
		),
		index("character_permission_character_id_idx").on(table.characterId),
		index("character_permission_grantee_user_id_idx").on(table.granteeUserId),
	],
);
