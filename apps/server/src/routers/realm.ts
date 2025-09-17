import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { user } from "../db/schema/auth";
import { character } from "../db/schema/character";
import { realm } from "../db/schema/realm";
import { realmMember } from "../db/schema/realmMember";
import { deleteFile, getFileUrl } from "../lib/storage";
import { protectedProcedure, router } from "../lib/trpc";
import {
	realmCreateInputSchema,
	realmIdSchema,
	realmJoinInputSchema,
	realmTransferOwnershipInputSchema,
	realmUpdateInputSchema,
} from "../schemas/index";

export const realmRouter = router({
	create: protectedProcedure
		.input(realmCreateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

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
			})
			.from(realm)
			.innerJoin(realmMember, eq(realm.id, realmMember.realmId))
			.where(eq(realmMember.userId, userId));

		// Generate S3 URLs for icons
		const rowsWithUrls = await Promise.all(
			rows.map(async (row) => {
				if (row.iconKey) {
					try {
						const iconUrl = await getFileUrl(row.iconKey);
						return { ...row, iconKey: iconUrl };
					} catch (error) {
						console.error(`Failed to get URL for icon ${row.iconKey}:`, error);
						return { ...row, iconKey: null };
					}
				}
				return row;
			}),
		);

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
				throw new TRPCError({ code: "NOT_FOUND", message: "Realm not found" });
			}

			if (r.password) {
				if (!password) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Password required",
					});
				}
				const ok = await Bun.password.verify(password, r.password);
				if (!ok) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "Invalid password",
					});
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
				})
				.from(realm)
				.innerJoin(realmMember, eq(realm.id, realmMember.realmId))
				.where(and(eq(realm.id, realmId), eq(realmMember.userId, userId)))
				.limit(1);

			if (!result) {
				// Return generic error to prevent information leakage
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Access denied. The requested resource is not available.",
				});
			}

			// Generate S3 URL for icon if it exists
			if (result.iconKey) {
				try {
					const iconUrl = await getFileUrl(result.iconKey);
					return { ...result, iconKey: iconUrl };
				} catch (error) {
					console.error(`Failed to get URL for icon ${result.iconKey}:`, error);
					return { ...result, iconKey: null };
				}
			}

			return result;
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
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Access denied. You are not a member of this realm.",
				});
			}

			// Get realm owner ID
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
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Realm not found",
				});
			}

			if (realmData.ownerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Access denied. The requested resource is not available.",
				});
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
