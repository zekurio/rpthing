import {
	boolean,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

// Realm acts as a universe container
export const realm = pgTable("realm", {
	id: uuid("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
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

// Many-to-many relation between User and Realm
export const realmMember = pgTable(
	"realm_member",
	{
		realmId: uuid("realm_id")
			.notNull()
			.references(() => realm.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").$type<"owner" | "admin" | "member">().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.realmId, table.userId] }),
	}),
);

// Character belongs to a Realm and a creator (User)
export const character = pgTable("character", {
	id: uuid("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	realmId: uuid("realm_id")
		.notNull()
		.references(() => realm.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	gender: text("gender"),
	referenceImageKey: text("reference_image_key"),
	imageCrop: jsonb("image_crop").$type<Record<string, unknown> | null>(),
	notes: text("notes"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

// Rating categories defined per Realm
export const ratingCategory = pgTable("rating_category", {
	id: uuid("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	realmId: uuid("realm_id")
		.notNull()
		.references(() => realm.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

// Character ratings per category (value range 1-20 enforced in app layer)
export const characterRating = pgTable(
	"character_rating",
	{
		characterId: uuid("character_id")
			.notNull()
			.references(() => character.id, { onDelete: "cascade" }),
		categoryId: uuid("category_id")
			.notNull()
			.references(() => ratingCategory.id, { onDelete: "cascade" }),
		value: integer("value").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.characterId, table.categoryId] }),
	}),
);

// Field-level editing permissions for Characters
export const characterPermission = pgTable("character_permission", {
	id: uuid("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	characterId: uuid("character_id")
		.notNull()
		.references(() => character.id, { onDelete: "cascade" }),
	field: text("field").notNull(),
	grantedToUserId: uuid("granted_to_user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	canEdit: boolean("can_edit").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});
