import {
	realmCreateInputSchema,
	realmIdSchema,
	realmJoinInputSchema,
	realmTransferOwnershipInputSchema,
	realmUpdateInputSchema,
} from "@schemas";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/index";
import { user } from "@/server/db/schema/auth";
import { character } from "@/server/db/schema/character";
import { realm } from "@/server/db/schema/realm";
import { realmMember } from "@/server/db/schema/realmMember";
import { trait } from "@/server/db/schema/traits";
import { deleteFile, getPublicFileUrl } from "@/server/storage";
import { protectedProcedure, router } from "@/server/trpc";

export const realmRouter = router({
	create: protectedProcedure
		.input(realmCreateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

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
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "You must be a member of the template realm",
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
		}),

	list: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

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
	}),

	join: protectedProcedure
		.input(realmJoinInputSchema)
		.mutation(async ({ ctx, input }) => {
			const { realmId, password } = input;

			const [r] = await db
				.select({ id: realm.id, password: realm.password })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!r) {
				// Return false instead of throwing error
				return false;
			}

			if (r.password) {
				if (!password) {
					// Return false instead of throwing error
					return false;
				}
				const ok = await Bun.password.verify(password, r.password);
				if (!ok) {
					// Return false instead of throwing error
					return false;
				}
			}

			// Persist membership when join succeeds
			const userId = ctx.session.user.id;
			await db
				.insert(realmMember)
				.values({ realmId, userId })
				.onConflictDoNothing();
			return true;
		}),

	getById: protectedProcedure
		.input(z.object({ realmId: realmIdSchema }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId } = input;

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
				// Return null instead of throwing error
				return null;
			}

			// Generate public URL for icon if it exists
			const iconUrl = result.iconKey ? getPublicFileUrl(result.iconKey) : null;
			const hasPassword = result.password !== null;
			const { password: _, ...rest } = result;
			return { ...rest, iconKey: iconUrl, hasPassword };
		}),

	delete: protectedProcedure
		.input(realmIdSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [r] = await db
				.select({ ownerId: realm.ownerId, iconKey: realm.iconKey })
				.from(realm)
				.where(eq(realm.id, input))
				.limit(1);

			if (!r) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Realm not found" });
			}

			if (r.ownerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
				});
			}

			// Get all character reference images before deleting the realm
			const characters = await db
				.select({ referenceImageKey: character.referenceImageKey })
				.from(character)
				.where(eq(character.realmId, input));

			// Collect all files to delete (use a Set to avoid duplicates)
			const filesToDeleteSet = new Set<string>();

			// Add realm icon if it exists
			if (r.iconKey) {
				filesToDeleteSet.add(r.iconKey);
				console.log(`Will delete realm icon (from DB): ${r.iconKey}`);
			}

			// Also add stable icon key path in case DB is out of sync
			const stableIconKey = `realm-icons/${input}.png`;
			filesToDeleteSet.add(stableIconKey);
			console.log(`Will delete realm icon (stable path): ${stableIconKey}`);

			// Add character reference images
			for (const char of characters) {
				if (char.referenceImageKey) {
					filesToDeleteSet.add(char.referenceImageKey);
					console.log(`Will delete character image: ${char.referenceImageKey}`);
				}
			}

			const filesToDelete = Array.from(filesToDeleteSet);
			console.log(`Total files to delete: ${filesToDelete.length}`);

			// Delete all files first
			const deleteResults = await Promise.allSettled(
				filesToDelete.map(async (fileKey) => {
					try {
						console.log(`Attempting to delete file: ${fileKey}`);
						await deleteFile(fileKey);
						console.log(`Successfully deleted file: ${fileKey}`);
						return { success: true, fileKey };
					} catch (error) {
						console.error(`Failed to delete file ${fileKey}:`, error);
						return { success: false, fileKey, error };
					}
				}),
			);

			// Log results
			const successful = deleteResults.filter(
				(r) => r.status === "fulfilled" && r.value.success,
			).length;
			const failed = deleteResults.filter(
				(r) =>
					r.status === "rejected" ||
					(r.status === "fulfilled" && !r.value.success),
			).length;
			console.log(
				`File deletion results: ${successful} successful, ${failed} failed`,
			);

			// Delete the realm
			await db.delete(realm).where(eq(realm.id, input));

			return true;
		}),

	update: protectedProcedure
		.input(realmUpdateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { id, ...updates } = input;

			// Check if user is the owner
			const [r] = await db
				.select({ ownerId: realm.ownerId, iconKey: realm.iconKey })
				.from(realm)
				.where(eq(realm.id, id))
				.limit(1);

			if (!r) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Realm not found" });
			}

			if (r.ownerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the realm owner can update it",
				});
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

			// Icon operations are now handled via separate endpoints

			await db.update(realm).set(updateData).where(eq(realm.id, id));

			return { success: true };
		}),

	getMembers: protectedProcedure
		.input(z.object({ realmId: realmIdSchema }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId } = input;

			// Check if user is a member of this realm (including owner)
			const [memberCheck] = await db
				.select({ id: realmMember.id })
				.from(realmMember)
				.where(
					and(eq(realmMember.realmId, realmId), eq(realmMember.userId, userId)),
				)
				.limit(1);

			if (!memberCheck) {
				// Return empty array instead of throwing error
				return [];
			}

			// Get realm owner ID
			const [realmData] = await db
				.select({ ownerId: realm.ownerId })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!realmData) {
				// Return empty array instead of throwing error
				return [];
			}

			// Get all members with their roles determined dynamically
			const members = await db
				.select({
					userId: user.id,
					name: user.name,
					email: user.email,
					image: user.image,
					joinedAt: realmMember.createdAt,
				})
				.from(realmMember)
				.innerJoin(user, eq(user.id, realmMember.userId))
				.where(eq(realmMember.realmId, realmId))
				.orderBy(realmMember.createdAt);

			// Add role information dynamically
			const membersWithRoles = members.map((member) => ({
				...member,
				role:
					member.userId === realmData.ownerId
						? ("owner" as const)
						: ("member" as const),
			}));

			return membersWithRoles;
		}),

	getOwner: protectedProcedure
		.input(z.object({ realmId: realmIdSchema }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId } = input;

			// Check if user is the owner of this realm
			const [realmData] = await db
				.select({ ownerId: realm.ownerId })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!realmData) {
				// Return null instead of throwing error
				return null;
			}

			if (realmData.ownerId !== userId) {
				// Return null instead of throwing error
				return null;
			}

			// Get owner information
			const [owner] = await db
				.select({
					userId: user.id,
					name: user.name,
					email: user.email,
					image: user.image,
					createdAt: realm.createdAt,
				})
				.from(realm)
				.innerJoin(user, eq(user.id, realm.ownerId))
				.where(eq(realm.id, realmId))
				.limit(1);

			return owner;
		}),

	leave: protectedProcedure
		.input(realmIdSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const realmId = input;

			// Check if user is a member of this realm
			const [memberCheck] = await db
				.select({ id: realmMember.id })
				.from(realmMember)
				.where(
					and(eq(realmMember.realmId, realmId), eq(realmMember.userId, userId)),
				)
				.limit(1);

			if (!memberCheck) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "You are not a member of this realm",
				});
			}

			// Check if user is the owner
			const [realmData] = await db
				.select({ ownerId: realm.ownerId })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!realmData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Realm not found",
				});
			}

			if (realmData.ownerId === userId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
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
		}),

	transferOwnership: protectedProcedure
		.input(realmTransferOwnershipInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId, newOwnerUserId } = input;

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
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Realm not found",
				});
			}

			if (r.ownerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
				});
			}

			// Check if new owner exists
			const [newOwner] = await db
				.select({ id: user.id })
				.from(user)
				.where(eq(user.id, newOwnerUserId))
				.limit(1);

			if (!newOwner) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "New owner not found",
				});
			}

			// Transfer ownership
			await db
				.update(realm)
				.set({ ownerId: newOwnerUserId })
				.where(eq(realm.id, realmId));

			return true;
		}),
});
