import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index";
import { user } from "../db/schema/auth";
import { character } from "../db/schema/character";
import { characterPermission } from "../db/schema/permissions";
import { realmMember } from "../db/schema/realmMember";
import { characterTraitRating, trait } from "../db/schema/traits";
import { deleteFile, getFileUrl, getPublicFileUrl } from "../lib/storage";
import { protectedProcedure, router } from "../lib/trpc";
import {
	characterCreateInputSchema,
	characterIdOnlySchema,
	characterListInputSchema,
	characterUpdateInputSchema,
} from "../schemas";
import {
	characterPermissionDeleteInputSchema,
	characterPermissionListInputSchema,
	characterPermissionUpsertInputSchema,
} from "../schemas/permissions";
import { ratingRouter } from "./characterTraitRating";

// Helper function to check if user is a realm member (including owner)
async function isRealmMember(userId: string, realmId: string) {
	const [member] = await db
		.select({ id: realmMember.id })
		.from(realmMember)
		.where(
			and(eq(realmMember.realmId, realmId), eq(realmMember.userId, userId)),
		)
		.limit(1);
	return !!member;
}

export const characterRouter = router({
	ratings: ratingRouter,
	permissions: router({
		list: protectedProcedure
			.input(characterPermissionListInputSchema)
			.query(async ({ ctx, input }) => {
				const userId = ctx.session.user.id;
				const { characterId } = input;

				const [charRow] = await db
					.select({ realmId: character.realmId, ownerId: character.userId })
					.from(character)
					.where(eq(character.id, characterId))
					.limit(1);
				if (!charRow) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Character not found",
					});
				}
				// Only realm member or character owner can see permissions
				const isMember = await isRealmMember(userId, charRow.realmId);
				if (!isMember && charRow.ownerId !== userId) {
					throw new TRPCError({ code: "FORBIDDEN", message: "Not permitted" });
				}

				return await db
					.select({
						id: characterPermission.id,
						granteeUserId: characterPermission.granteeUserId,
						scope: characterPermission.scope,
						createdAt: characterPermission.createdAt,
						updatedAt: characterPermission.updatedAt,
					})
					.from(characterPermission)
					.where(eq(characterPermission.characterId, characterId));
			}),
		upsert: protectedProcedure
			.input(characterPermissionUpsertInputSchema)
			.mutation(async ({ ctx, input }) => {
				const userId = ctx.session.user.id;
				const { characterId, granteeUserId, scope } = input;

				if (granteeUserId === userId) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Cannot grant to self",
					});
				}

				const [charRow] = await db
					.select({ realmId: character.realmId, ownerId: character.userId })
					.from(character)
					.where(eq(character.id, characterId))
					.limit(1);
				if (!charRow) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Character not found",
					});
				}
				// Only realm member or character owner can grant
				const isMember = await isRealmMember(userId, charRow.realmId);
				if (!isMember && charRow.ownerId !== userId) {
					throw new TRPCError({ code: "FORBIDDEN", message: "Not permitted" });
				}

				const [existing] = await db
					.select({ id: characterPermission.id })
					.from(characterPermission)
					.where(
						and(
							eq(characterPermission.characterId, characterId),
							eq(characterPermission.granteeUserId, granteeUserId),
							eq(characterPermission.scope, scope),
						),
					)
					.limit(1);

				if (existing) return { success: true, id: existing.id };

				const [created] = await db
					.insert(characterPermission)
					.values({ characterId, granteeUserId, scope })
					.returning();
				return { success: true, id: created.id };
			}),
		delete: protectedProcedure
			.input(characterPermissionDeleteInputSchema)
			.mutation(async ({ ctx, input }) => {
				const userId = ctx.session.user.id;
				const { characterId, granteeUserId, scope } = input;

				const [charRow] = await db
					.select({ realmId: character.realmId, ownerId: character.userId })
					.from(character)
					.where(eq(character.id, characterId))
					.limit(1);
				if (!charRow) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Character not found",
					});
				}
				// Only realm member or character owner can delete permissions
				const isMember = await isRealmMember(userId, charRow.realmId);
				if (!isMember && charRow.ownerId !== userId) {
					throw new TRPCError({ code: "FORBIDDEN", message: "Not permitted" });
				}

				await db
					.delete(characterPermission)
					.where(
						and(
							eq(characterPermission.characterId, characterId),
							eq(characterPermission.granteeUserId, granteeUserId),
							eq(characterPermission.scope, scope),
						),
					);
				return { success: true };
			}),
	}),
	create: protectedProcedure
		.input(characterCreateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId, ...rest } = input;

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, realmId);
			if (!isMember) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a realm member",
				});
			}

			const [created] = await db
				.insert(character)
				.values({ realmId, userId, ...rest })
				.returning();
			return created;
		}),

	getById: protectedProcedure
		.input(characterIdOnlySchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [row] = await db
				.select({
					id: character.id,
					realmId: character.realmId,
					userId: character.userId,
					isPublic: character.isPublic,
					name: character.name,
					gender: character.gender,
					referenceImageKey: character.referenceImageKey,
					croppedImageKey: character.croppedImageKey,
					notes: character.notes,
					createdAt: character.createdAt,
					updatedAt: character.updatedAt,
				})
				.from(character)
				.where(eq(character.id, input.id))
				.limit(1);
			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Character not found",
				});
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, row.realmId);
			if (!isMember) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a realm member",
				});
			}

			// Generate public URLs for character images
			const referenceUrl = row.referenceImageKey
				? getPublicFileUrl(row.referenceImageKey)
				: null;
			const croppedUrl = row.croppedImageKey
				? getPublicFileUrl(row.croppedImageKey)
				: null;
			return {
				...row,
				referenceImageKey: referenceUrl,
				croppedImageKey: croppedUrl,
			};
		}),

	list: protectedProcedure
		.input(characterListInputSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId } = input;

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, realmId);
			if (!isMember) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a realm member",
				});
			}

				const rows = await db
				.select({
					id: character.id,
					name: character.name,
					gender: character.gender,
					isPublic: character.isPublic,
					referenceImageKey: character.referenceImageKey,
					croppedImageKey: character.croppedImageKey,
					ownerId: character.userId,
					ownerName: user.name,
					createdAt: character.createdAt,
					updatedAt: character.updatedAt,
				})
				.from(character)
				.leftJoin(user, eq(user.id, character.userId))
				.where(eq(character.realmId, realmId));

				// Gather ratings summary for all characters in one query to avoid N+1
				const characterIds = rows.map((r) => r.id);
				let ratingsByCharacter: Record<string, Array<{
					traitId: string;
					traitName: string;
					description: string | null;
					displayMode: "number" | "grade";
					ratingId: string | null;
					value: number | null;
				}>> = {};
				if (characterIds.length > 0) {
					const ratingRows = await db
						.select({
							characterId: characterTraitRating.characterId,
							traitId: trait.id,
							traitName: trait.name,
							description: trait.description,
							displayMode: trait.displayMode,
							ratingId: characterTraitRating.id,
							value: characterTraitRating.value,
						})
						.from(trait)
						.leftJoin(
							characterTraitRating,
							and(
								eq(characterTraitRating.traitId, trait.id),
								inArray(characterTraitRating.characterId, characterIds),
							),
						)
						.where(eq(trait.realmId, realmId));

					ratingsByCharacter = ratingRows
						.filter((row) => row.characterId !== null)
						.reduce((acc, row) => {
							const key = String(row.characterId);
							const list = acc[key] || [];
							list.push({
								traitId: row.traitId,
								traitName: row.traitName,
								description: row.description ?? null,
								displayMode: row.displayMode,
								ratingId: row.ratingId ?? null,
								value: row.value ?? null,
							});
							acc[key] = list;
							return acc;
						}, {} as typeof ratingsByCharacter);
				}

				// Generate public URLs for character images and attach ratings summary
				const withUrls = rows.map((row) => {
					const referenceUrl = row.referenceImageKey
						? getPublicFileUrl(row.referenceImageKey)
						: null;
					const croppedUrl = row.croppedImageKey
						? getPublicFileUrl(row.croppedImageKey)
						: null;
					return {
						...row,
						referenceImageKey: referenceUrl,
						croppedImageKey: croppedUrl,
						ratingsSummary: ratingsByCharacter[row.id] ?? [],
					};
				});

				return withUrls;
		}),

	update: protectedProcedure
		.input(characterUpdateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { id, ...updates } = input;

			const [row] = await db
				.select({ realmId: character.realmId, ownerId: character.userId })
				.from(character)
				.where(eq(character.id, id))
				.limit(1);
			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Character not found",
				});
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, row.realmId);
			if (!isMember) {
				// Allow if character owner (even if not realm member)
				if (row.ownerId !== userId) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Not permitted",
					});
				}
			}

			await db.update(character).set(updates).where(eq(character.id, id));
			return { success: true };
		}),

	delete: protectedProcedure
		.input(characterIdOnlySchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [row] = await db
				.select({
					realmId: character.realmId,
					imageKey: character.referenceImageKey,
					ownerId: character.userId,
				})
				.from(character)
				.where(eq(character.id, input.id))
				.limit(1);
			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Character not found",
				});
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, row.realmId);
			if (!isMember) {
				if (row.ownerId !== userId) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Not permitted to delete character",
					});
				}
			}

			// Attempt to delete stored image(s) if present (best-effort)
			const originalKey = `character-images/${input.id}.png`;
			const croppedKey = `character-images/${input.id}-cropped.png`;
			const keys = new Set<string>([originalKey, croppedKey]);
			if (row.imageKey) keys.add(row.imageKey);
			// Also try deleting any stored cropped key variant if present
			const [existing] = await db
				.select({
					ref: character.referenceImageKey,
					crop: character.croppedImageKey,
				})
				.from(character)
				.where(eq(character.id, input.id))
				.limit(1);
			if (existing?.ref) keys.add(existing.ref);
			if (existing?.crop) keys.add(existing.crop);
			for (const key of keys) {
				try {
					await deleteFile(key);
				} catch (err) {
					console.error(`Failed to delete character image ${key}:`, err);
				}
			}

			await db.delete(character).where(eq(character.id, input.id));
			return true;
		}),

	getWithRatings: protectedProcedure
		.input(characterIdOnlySchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [charRow] = await db
				.select({
					id: character.id,
					realmId: character.realmId,
					name: character.name,
				})
				.from(character)
				.where(eq(character.id, input.id))
				.limit(1);
			if (!charRow) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Character not found",
				});
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, charRow.realmId);
			if (!isMember) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a realm member",
				});
			}

			// Traits in the realm with any rating for this character
			const rows = await db
				.select({
					traitId: trait.id,
					traitName: trait.name,
					description: trait.description,
					displayMode: trait.displayMode,
					ratingId: characterTraitRating.id,
					value: characterTraitRating.value,
				})
				.from(trait)
				.leftJoin(
					characterTraitRating,
					and(
						eq(characterTraitRating.traitId, trait.id),
						eq(characterTraitRating.characterId, input.id),
					),
				)
				.where(eq(trait.realmId, charRow.realmId));

			return { ...charRow, traits: rows };
		}),
});
