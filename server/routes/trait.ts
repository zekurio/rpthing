import { and, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db/index";
import { user as userTable } from "@/server/db/schema/auth";
import { realmMember } from "@/server/db/schema/realmMember";
import { trait } from "@/server/db/schema/traits";
import {
	traitCreateInputSchema,
	traitIdOnlySchema,
	traitIdSchema,
	traitListInputSchema,
	traitUpdateInputSchema,
} from "@/server/db/types";

// Helper function to check if user is a realm member (including owner)
async function isRealmMember(userId: string, realmId: string) {
	const result = await db
		.select({ id: realmMember.id })
		.from(realmMember)
		.where(
			and(eq(realmMember.realmId, realmId), eq(realmMember.userId, userId)),
		)
		.limit(1);
	const member = result[0];
	return !!member;
}

export const traitRoutes = new Elysia({ prefix: "/trait" })
	.macro({
		isAuthenticated: {
			async resolve({ status, request: { headers } }) {
				const session = await auth.api.getSession({ headers });
				if (!session) {
					return status(401, { error: "Unauthorized" });
				}
				return {
					user: session.user,
					session: session.session,
				};
			},
		},
	})
	// POST /api/trait - Create a new trait
	.post(
		"/",
		async ({ body, user, status }) => {
			const parsed = traitCreateInputSchema.safeParse(body);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { realmId, name, description, displayMode } = parsed.data;
			const userId = user.id;

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, realmId);
			if (!isMember) {
				return status(403, { error: "Not a realm member" });
			}

			const result = await db
				.insert(trait)
				.values({
					realmId,
					createdByUserId: userId,
					name,
					description: description ?? null,
					displayMode: displayMode ?? undefined,
				})
				.returning();
			const created = result[0];

			return created;
		},
		{ isAuthenticated: true },
	)
	// GET /api/trait - List traits for a realm
	.get(
		"/",
		async ({ query, user, status }) => {
			const parsed = traitListInputSchema.safeParse(query);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { realmId } = parsed.data;
			const userId = user.id;

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, realmId);
			if (!isMember) {
				return status(403, { error: "Not a realm member" });
			}

			return await db
				.select({
					id: trait.id,
					name: trait.name,
					description: trait.description,
					displayMode: trait.displayMode,
					realmId: trait.realmId,
					createdAt: trait.createdAt,
					updatedAt: trait.updatedAt,
					createdByUserId: trait.createdByUserId,
					createdByName: userTable.name,
				})
				.from(trait)
				.leftJoin(userTable, eq(userTable.id, trait.createdByUserId))
				.where(eq(trait.realmId, realmId));
		},
		{ isAuthenticated: true },
	)
	// GET /api/trait/:id - Get a single trait by ID
	.get(
		"/:id",
		async ({ params, user, status }) => {
			const parsed = z.object({ id: traitIdSchema }).safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { id } = parsed.data;
			const userId = user.id;

			const result = await db
				.select({
					id: trait.id,
					name: trait.name,
					description: trait.description,
					displayMode: trait.displayMode,
					realmId: trait.realmId,
					createdByUserId: trait.createdByUserId,
					createdByName: userTable.name,
					createdAt: trait.createdAt,
					updatedAt: trait.updatedAt,
				})
				.from(trait)
				.leftJoin(userTable, eq(userTable.id, trait.createdByUserId))
				.where(eq(trait.id, id))
				.limit(1);
			const t = result[0];

			if (!t) {
				return null;
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, t.realmId);
			if (!isMember) {
				return null;
			}

			return t;
		},
		{ isAuthenticated: true },
	)
	// PATCH /api/trait/:id - Update a trait
	.patch(
		"/:id",
		async ({ params, body, user, status }) => {
			const parsed = traitUpdateInputSchema.safeParse({
				...(body as Record<string, unknown>),
				id: params.id,
			});
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { id, ...updates } = parsed.data;
			const userId = user.id;

			const result = await db
				.select({ id: trait.id, realmId: trait.realmId })
				.from(trait)
				.where(eq(trait.id, id))
				.limit(1);
			const t = result[0];

			if (!t) {
				return status(404, { error: "Trait not found" });
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, t.realmId);
			if (!isMember) {
				return status(403, { error: "Not a realm member" });
			}

			await db.update(trait).set(updates).where(eq(trait.id, id));

			return { success: true };
		},
		{ isAuthenticated: true },
	)
	// DELETE /api/trait/:id - Delete a trait
	.delete(
		"/:id",
		async ({ params, user, status }) => {
			const parsed = z.object({ id: traitIdOnlySchema }).safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { id } = parsed.data;
			const userId = user.id;

			const result = await db
				.select({ id: trait.id, realmId: trait.realmId })
				.from(trait)
				.where(eq(trait.id, id))
				.limit(1);
			const t = result[0];

			if (!t) {
				return status(404, { error: "Trait not found" });
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, t.realmId);
			if (!isMember) {
				return status(403, { error: "Not a realm member" });
			}

			await db.delete(trait).where(eq(trait.id, id));

			return true;
		},
		{ isAuthenticated: true },
	);
