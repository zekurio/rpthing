import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { character, realm, realmMember } from "../db/schema/rp.js";
import { deleteFile, getFileUrl } from "../lib/storage.js";
import { protectedProcedure, router } from "../lib/trpc.js";
import {
	realmCreateInputSchema,
	realmIdSchema,
	realmJoinInputSchema,
	realmTransferOwnershipInputSchema,
	realmUpdateInputSchema,
} from "../schemas/index.js";

export const realmRouter = router({
	create: protectedProcedure
		.input(realmCreateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [created] = await db.transaction(async (tx) => {
				const [inserted] = await tx
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

				await tx.insert(realmMember).values({
					realmId: inserted.id,
					userId,
					role: "owner",
				});

				return [inserted];
			});

			// Icon upload is now handled via separate endpoint

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
				role: realmMember.role,
			})
			.from(realmMember)
			.innerJoin(realm, eq(realm.id, realmMember.realmId))
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

	getById: protectedProcedure
		.input(z.object({ realmId: realmIdSchema }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId } = input;

			// Check if user is a member of this realm
			const [result] = await db
				.select({
					id: realm.id,
					name: realm.name,
					description: realm.description,
					iconKey: realm.iconKey,
					ownerId: realm.ownerId,
					createdAt: realm.createdAt,
					updatedAt: realm.updatedAt,
					role: realmMember.role,
				})
				.from(realmMember)
				.innerJoin(realm, eq(realm.id, realmMember.realmId))
				.where(
					and(eq(realmMember.realmId, realmId), eq(realmMember.userId, userId)),
				)
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

	join: protectedProcedure
		.input(realmJoinInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId, password } = input;

			// Check if realm exists
			const [r] = await db
				.select({ id: realm.id, password: realm.password })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!r) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Realm not found" });
			}

			// If realm has a password, verify it
			if (r.password) {
				const ok = password
					? await Bun.password.verify(password, r.password)
					: false;
				if (!ok) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "Invalid password",
					});
				}
			}

			// If already a member, succeed idempotently
			const existing = await db
				.select({ userId: realmMember.userId })
				.from(realmMember)
				.where(
					and(eq(realmMember.realmId, realmId), eq(realmMember.userId, userId)),
				)
				.limit(1);
			if (existing.length > 0) {
				return true;
			}

			await db.insert(realmMember).values({ realmId, userId, role: "member" });
			return true;
		}),

	leave: protectedProcedure
		.input(realmIdSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [r] = await db
				.select({ ownerId: realm.ownerId })
				.from(realm)
				.where(eq(realm.id, input))
				.limit(1);

			if (!r) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Realm not found" });
			}

			if (r.ownerId === userId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Owners cannot leave their own realm. Delete it instead.",
				});
			}

			const result = await db
				.delete(realmMember)
				.where(
					and(eq(realmMember.realmId, input), eq(realmMember.userId, userId)),
				);

			if ((result as unknown as { rowsAffected?: number }).rowsAffected === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Membership not found",
				});
			}

			return true;
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

			// Delete membership relations explicitly, then delete the realm
			await db.transaction(async (tx) => {
				await tx.delete(realmMember).where(eq(realmMember.realmId, input));
				await tx.delete(realm).where(eq(realm.id, input));
			});

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

	transferOwnership: protectedProcedure
		.input(realmTransferOwnershipInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId, newOwnerUserId } = input;

			if (userId === newOwnerUserId) {
				return true;
			}

			await db.transaction(async (tx) => {
				const [r] = await tx
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

				const [targetMembership] = await tx
					.select({ userId: realmMember.userId, role: realmMember.role })
					.from(realmMember)
					.where(
						and(
							eq(realmMember.realmId, realmId),
							eq(realmMember.userId, newOwnerUserId),
						),
					)
					.limit(1);

				if (!targetMembership) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "New owner must be a member of the realm",
					});
				}

				// Demote current owner to admin, promote new owner
				await tx
					.update(realm)
					.set({ ownerId: newOwnerUserId })
					.where(eq(realm.id, realmId));

				await tx
					.update(realmMember)
					.set({ role: "admin" })
					.where(
						and(
							eq(realmMember.realmId, realmId),
							eq(realmMember.userId, userId),
						),
					);

				await tx
					.update(realmMember)
					.set({ role: "owner" })
					.where(
						and(
							eq(realmMember.realmId, realmId),
							eq(realmMember.userId, newOwnerUserId),
						),
					);
			});

			return true;
		}),
});
