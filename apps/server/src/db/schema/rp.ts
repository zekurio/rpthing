import {
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth";

// Realm acts as a universe container
export const realm = sqliteTable("realm", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	name: text("name").notNull(),
	description: text("description"),
	password: text("password"),
	iconKey: text("icon_key"),
	ownerId: text("owner_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.default(new Date())
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

// Many-to-many relation between User and Realm
export const realmMember = sqliteTable(
	"realm_member",
	{
		realmId: text("realm_id")
			.notNull()
			.references(() => realm.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").$type<"owner" | "admin" | "member">().notNull(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.default(new Date())
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.default(new Date())
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [primaryKey({ columns: [table.realmId, table.userId] })],
);

// Character belongs to a Realm and a creator (User)
export const character = sqliteTable("character", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	realmId: text("realm_id")
		.notNull()
		.references(() => realm.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	gender: text("gender"),
	referenceImageKey: text("reference_image_key"),
	imageCrop: text("image_crop").$type<Record<string, unknown> | null>(),
	notes: text("notes"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.default(new Date())
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

// Rating categories defined per Realm
export const ratingCategory = sqliteTable("rating_category", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	realmId: text("realm_id")
		.notNull()
		.references(() => realm.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.default(new Date())
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

// Character ratings per category (value range 1-20 enforced in app layer)
export const characterRating = sqliteTable(
	"character_rating",
	{
		characterId: text("character_id")
			.notNull()
			.references(() => character.id, { onDelete: "cascade" }),
		categoryId: text("category_id")
			.notNull()
			.references(() => ratingCategory.id, { onDelete: "cascade" }),
		value: integer("value").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.default(new Date())
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.default(new Date())
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [primaryKey({ columns: [table.characterId, table.categoryId] })],
);

// Field-level editing permissions for Characters
export const characterPermission = sqliteTable("character_permission", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	characterId: text("character_id")
		.notNull()
		.references(() => character.id, { onDelete: "cascade" }),
	field: text("field").notNull(),
	grantedToUserId: text("granted_to_user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	canEdit: integer("can_edit", { mode: "boolean" }).default(false).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.default(new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.default(new Date())
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});
