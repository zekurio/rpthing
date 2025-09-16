import {
	index,
	pgEnum,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { character } from "./character";
import { realm } from "./realm";

export const traitDisplayModeEnum = pgEnum("trait_display_mode", [
	"number",
	"grade",
]);

// Realm-specific trait definitions
export const trait = pgTable(
	"trait",
	{
		id: uuid("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		realmId: text("realm_id")
			.notNull()
			.references(() => realm.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		description: text("description"),
		displayMode: traitDisplayModeEnum("display_mode")
			.notNull()
			.default("grade"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("trait_realm_id_name_unique").on(table.realmId, table.name),
		index("trait_realm_id_idx").on(table.realmId),
	],
);

// Rating a character for a given trait (1..20)
export const characterTraitRating = pgTable(
	"character_trait_rating",
	{
		id: uuid("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		characterId: uuid("character_id")
			.notNull()
			.references(() => character.id, { onDelete: "cascade" }),
		traitId: uuid("trait_id")
			.notNull()
			.references(() => trait.id, { onDelete: "cascade" }),
		value: smallint("value").notNull(), // 1..20
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("ctr_character_trait_unique").on(
			table.characterId,
			table.traitId,
		),
		index("ctr_character_id_idx").on(table.characterId),
		index("ctr_trait_id_idx").on(table.traitId),
	],
);
