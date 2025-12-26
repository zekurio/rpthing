import { and, eq, sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db/index";
import { user as userTable } from "@/server/db/schema/auth";
import { character } from "@/server/db/schema/character";
import { realm } from "@/server/db/schema/realm";
import { realmMember } from "@/server/db/schema/realmMember";
import { trait } from "@/server/db/schema/traits";
import {
	realmCreateInputSchema,
	realmIdSchema,
	realmJoinInputSchema,
	realmTransferOwnershipInputSchema,
	realmUpdateInputSchema,
} from "@/server/db/types";
import { deleteFile, getPublicFileUrl } from "@/server/storage";

export const realmRoutes = new Elysia({ prefix: "/realm" })
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
	// POST /api/realm - Create a new realm
	.post(
		"/",
		async ({ body, user, status }) => {
			const parsed = realmCreateInputSchema.safeParse(body);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const input = parsed.data;
			const userId = user.id;

			// If a template realm is specified, verify user is a member of it
			if (input.templateRealmId) {
				const [memberCheck] = await db
					.select({ id: realmMember.id })
					.from(realmMember)
					.where(
						and(
							eq(realmMember.realmId, input.templateRealmId),
							eq(realmMember.userId, userId),
						),
					)
					.limit(1);

				if (!memberCheck) {
					return status(403, {
						error: "You must be a member of the template realm",
					});
				}
			}

			const [created] = await db
				.insert(realm)
				.values({
					name: input.name,
					description: input.description ?? null,
					password: input.password
						? await Bun.password.hash(input.password)
						: null,
					ownerId: userId,
				})
				.returning();

			// Ensure owner is persisted as a member
			await db
				.insert(realmMember)
				.values({ realmId: created.id, userId })
				.onConflictDoNothing();

			// Copy traits from template realm if specified
			if (input.templateRealmId) {
				const templateTraits = await db
					.select({
						name: trait.name,
						description: trait.description,
						displayMode: trait.displayMode,
					})
					.from(trait)
					.where(eq(trait.realmId, input.templateRealmId));

				if (templateTraits.length > 0) {
					await db.insert(trait).values(
						templateTraits.map((t) => ({
							realmId: created.id,
							createdByUserId: userId,
							name: t.name,
							description: t.description,
							displayMode: t.displayMode,
						})),
					);
				}
			}

			return created;
		},
		{ isAuthenticated: true },
	)
	// GET /api/realm - List all realms the user is a member of
	.get(
		"/",
		async ({ user }) => {
			const userId = user.id;

			const rows = await db
				.select({
					id: realm.id,
					name: realm.name,
					description: realm.description,
					iconKey: realm.iconKey,
					ownerId: realm.ownerId,
					createdAt: realm.createdAt,
					updatedAt: realm.updatedAt,
					memberCount:
						sql<number>`(SELECT count(*) FROM ${realmMember} WHERE ${realmMember.realmId} = ${realm.id})`.mapWith(
							Number,
						),
				})
				.from(realm)
				.innerJoin(realmMember, eq(realm.id, realmMember.realmId))
				.where(eq(realmMember.userId, userId));

			// Generate public URLs for icons
			const rowsWithUrls = rows.map((row) => {
				const iconUrl = row.iconKey ? getPublicFileUrl(row.iconKey) : null;
				return { ...row, iconKey: iconUrl };
			});

			return rowsWithUrls;
		},
		{ isAuthenticated: true },
	)
	// GET /api/realm/:realmId - Get a single realm by ID
	.get(
		"/:realmId",
		async ({ params, user, status }) => {
			const parsed = z.object({ realmId: realmIdSchema }).safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { realmId } = parsed.data;
			const userId = user.id;

			// Check if user is a member of this realm (owner or regular member)
			const [result] = await db
				.select({
					id: realm.id,
					name: realm.name,
					description: realm.description,
					iconKey: realm.iconKey,
					ownerId: realm.ownerId,
					createdAt: realm.createdAt,
					updatedAt: realm.updatedAt,
					password: realm.password,
				})
				.from(realm)
				.innerJoin(realmMember, eq(realm.id, realmMember.realmId))
				.where(and(eq(realm.id, realmId), eq(realmMember.userId, userId)))
				.limit(1);

			if (!result) {
				return null;
			}

			// Generate public URL for icon if it exists
			const iconUrl = result.iconKey ? getPublicFileUrl(result.iconKey) : null;
			const hasPassword = result.password !== null;
			const { password: _, ...rest } = result;
			return { ...rest, iconKey: iconUrl, hasPassword };
		},
		{ isAuthenticated: true },
	)
	// PATCH /api/realm/:realmId - Update a realm
	.patch(
		"/:realmId",
		async ({ params, body, user, status }) => {
			const parsed = realmUpdateInputSchema.safeParse({
				...(body as Record<string, unknown>),
				id: params.realmId,
			});
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { id, ...updates } = parsed.data;
			const userId = user.id;

			// Check if user is the owner
			const [r] = await db
				.select({ ownerId: realm.ownerId, iconKey: realm.iconKey })
				.from(realm)
				.where(eq(realm.id, id))
				.limit(1);

			if (!r) {
				return status(404, { error: "Realm not found" });
			}

			if (r.ownerId !== userId) {
				return status(403, { error: "Only the realm owner can update it" });
			}

			// Handle password hashing if provided
			const updateData: Record<string, unknown> = { ...updates };
			if (updates.password !== undefined) {
				if (updates.password) {
					updateData.password = await Bun.password.hash(updates.password);
				} else {
					updateData.password = null;
				}
			}

			await db.update(realm).set(updateData).where(eq(realm.id, id));

			return { success: true };
		},
		{ isAuthenticated: true },
	)
	// DELETE /api/realm/:realmId - Delete a realm
	.delete(
		"/:realmId",
		async ({ params, user, status }) => {
			const parsed = z.object({ realmId: realmIdSchema }).safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { realmId } = parsed.data;
			const userId = user.id;

			const [r] = await db
				.select({ ownerId: realm.ownerId, iconKey: realm.iconKey })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!r) {
				return status(404, { error: "Realm not found" });
			}

			if (r.ownerId !== userId) {
				return status(403, { error: "Not the realm owner" });
			}

			// Get all character reference images before deleting the realm
			const characters = await db
				.select({ referenceImageKey: character.referenceImageKey })
				.from(character)
				.where(eq(character.realmId, realmId));

			// Collect all files to delete (use a Set to avoid duplicates)
			const filesToDeleteSet = new Set<string>();

			// Add realm icon if it exists
			if (r.iconKey) {
				filesToDeleteSet.add(r.iconKey);
			}

			// Also add stable icon key path in case DB is out of sync
			const stableIconKey = `realm-icons/${realmId}.png`;
			filesToDeleteSet.add(stableIconKey);

			// Add character reference images
			for (const char of characters) {
				if (char.referenceImageKey) {
					filesToDeleteSet.add(char.referenceImageKey);
				}
			}

			const filesToDelete = Array.from(filesToDeleteSet);

			// Delete all files first
			await Promise.allSettled(
				filesToDelete.map(async (fileKey) => {
					try {
						await deleteFile(fileKey);
					} catch (error) {
						console.error(`Failed to delete file ${fileKey}:`, error);
					}
				}),
			);

			// Delete the realm
			await db.delete(realm).where(eq(realm.id, realmId));

			return true;
		},
		{ isAuthenticated: true },
	)
	// POST /api/realm/:realmId/join - Join a realm
	.post(
		"/:realmId/join",
		async ({ params, body, user, status }) => {
			const parsed = realmJoinInputSchema.safeParse({
				realmId: params.realmId,
				password: (body as { password?: string })?.password,
			});
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { realmId, password } = parsed.data;

			const [r] = await db
				.select({ id: realm.id, password: realm.password })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!r) {
				return false;
			}

			if (r.password) {
				if (!password) {
					return false;
				}
				const ok = await Bun.password.verify(password, r.password);
				if (!ok) {
					return false;
				}
			}

			// Persist membership when join succeeds
			const userId = user.id;
			await db
				.insert(realmMember)
				.values({ realmId, userId })
				.onConflictDoNothing();
			return true;
		},
		{ isAuthenticated: true },
	)
	// POST /api/realm/:realmId/leave - Leave a realm
	.post(
		"/:realmId/leave",
		async ({ params, user, status }) => {
			const parsed = z.object({ realmId: realmIdSchema }).safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { realmId } = parsed.data;
			const userId = user.id;

			// Check if user is a member of this realm
			const [memberCheck] = await db
				.select({ id: realmMember.id })
				.from(realmMember)
				.where(
					and(eq(realmMember.realmId, realmId), eq(realmMember.userId, userId)),
				)
				.limit(1);

			if (!memberCheck) {
				return status(404, { error: "You are not a member of this realm" });
			}

			// Check if user is the owner
			const [realmData] = await db
				.select({ ownerId: realm.ownerId })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!realmData) {
				return status(404, { error: "Realm not found" });
			}

			if (realmData.ownerId === userId) {
				return status(400, {
					error:
						"Realm owners cannot leave their own realm. Transfer ownership first or delete the realm.",
				});
			}

			// Remove the user from the realm
			await db
				.delete(realmMember)
				.where(
					and(eq(realmMember.realmId, realmId), eq(realmMember.userId, userId)),
				);

			return true;
		},
		{ isAuthenticated: true },
	)
	// GET /api/realm/:realmId/members - Get all members of a realm
	.get(
		"/:realmId/members",
		async ({ params, user, status }) => {
			const parsed = z.object({ realmId: realmIdSchema }).safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { realmId } = parsed.data;
			const userId = user.id;

			// Check if user is a member of this realm (including owner)
			const [memberCheck] = await db
				.select({ id: realmMember.id })
				.from(realmMember)
				.where(
					and(eq(realmMember.realmId, realmId), eq(realmMember.userId, userId)),
				)
				.limit(1);

			if (!memberCheck) {
				return [];
			}

			// Get realm owner ID
			const [realmData] = await db
				.select({ ownerId: realm.ownerId })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!realmData) {
				return [];
			}

			// Get all members with their roles determined dynamically
			const members = await db
				.select({
					odataUserId: userTable.id,
					name: userTable.name,
					email: userTable.email,
					image: userTable.image,
					joinedAt: realmMember.createdAt,
				})
				.from(realmMember)
				.innerJoin(userTable, eq(userTable.id, realmMember.userId))
				.where(eq(realmMember.realmId, realmId))
				.orderBy(realmMember.createdAt);

			// Add role information dynamically
			const membersWithRoles = members.map((member) => ({
				userId: member.odataUserId,
				name: member.name,
				email: member.email,
				image: member.image,
				joinedAt: member.joinedAt,
				role:
					member.odataUserId === realmData.ownerId
						? ("owner" as const)
						: ("member" as const),
			}));

			return membersWithRoles;
		},
		{ isAuthenticated: true },
	)
	// GET /api/realm/:realmId/owner - Get the owner of a realm
	.get(
		"/:realmId/owner",
		async ({ params, user: currentUser, status }) => {
			const parsed = z.object({ realmId: realmIdSchema }).safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { realmId } = parsed.data;
			const userId = currentUser.id;

			// Check if user is the owner of this realm
			const [realmData] = await db
				.select({ ownerId: realm.ownerId })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!realmData) {
				return null;
			}

			if (realmData.ownerId !== userId) {
				return null;
			}

			// Get owner information
			const [owner] = await db
				.select({
					odataUserId: userTable.id,
					name: userTable.name,
					email: userTable.email,
					image: userTable.image,
					createdAt: realm.createdAt,
				})
				.from(realm)
				.innerJoin(userTable, eq(userTable.id, realm.ownerId))
				.where(eq(realm.id, realmId))
				.limit(1);

			return owner
				? {
						userId: owner.odataUserId,
						name: owner.name,
						email: owner.email,
						image: owner.image,
						createdAt: owner.createdAt,
					}
				: null;
		},
		{ isAuthenticated: true },
	)
	// POST /api/realm/:realmId/transfer - Transfer ownership of a realm
	.post(
		"/:realmId/transfer",
		async ({ params, body, user: currentUser, status }) => {
			const parsed = realmTransferOwnershipInputSchema.safeParse({
				realmId: params.realmId,
				newOwnerUserId: (body as { newOwnerUserId?: string })?.newOwnerUserId,
			});
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { realmId, newOwnerUserId } = parsed.data;
			const userId = currentUser.id;

			if (userId === newOwnerUserId) {
				return true;
			}

			// Check if user is the current owner
			const [r] = await db
				.select({ ownerId: realm.ownerId })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!r) {
				return status(404, { error: "Realm not found" });
			}

			if (r.ownerId !== userId) {
				return status(403, { error: "Not the realm owner" });
			}

			// Check if new owner exists
			const [newOwner] = await db
				.select({ id: userTable.id })
				.from(userTable)
				.where(eq(userTable.id, newOwnerUserId))
				.limit(1);

			if (!newOwner) {
				return status(400, { error: "New owner not found" });
			}

			// Transfer ownership
			await db
				.update(realm)
				.set({ ownerId: newOwnerUserId })
				.where(eq(realm.id, realmId));

			return true;
		},
		{ isAuthenticated: true },
	);
