import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index";
import { character } from "../db/schema/character";
import { realm } from "../db/schema/realm";
import { characterTraitRating, trait } from "../db/schema/traits";
import { deleteFile, getFileUrl } from "../lib/storage";
import { protectedProcedure, router } from "../lib/trpc";
import {
	characterCreateInputSchema,
	characterIdOnlySchema,
	characterListInputSchema,
	characterUpdateInputSchema,
} from "../schemas";
import { ratingRouter } from "./characterTraitRating";

export const characterRouter = router({
	ratings: ratingRouter,
	create: protectedProcedure
		.input(characterCreateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId, ...rest } = input;

			const [ownsRealm] = await db
				.select({ id: realm.id })
				.from(realm)
				.where(and(eq(realm.id, realmId), eq(realm.ownerId, userId)))
				.limit(1);
			if (!ownsRealm) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
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

			const [ownsRealm] = await db
				.select({ id: realm.id })
				.from(realm)
				.where(and(eq(realm.id, row.realmId), eq(realm.ownerId, userId)))
				.limit(1);
			if (!ownsRealm) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
				});
			}

			if (!row.referenceImageKey) return row;

			const selectedKey = row.croppedImageKey ?? row.referenceImageKey;
			try {
				const url = await getFileUrl(selectedKey);
				return { ...row, referenceImageKey: url };
			} catch {
				return { ...row, referenceImageKey: null };
			}
		}),

	list: protectedProcedure
		.input(characterListInputSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId } = input;

			const [ownsRealm] = await db
				.select({ id: realm.id })
				.from(realm)
				.where(and(eq(realm.id, realmId), eq(realm.ownerId, userId)))
				.limit(1);
			if (!ownsRealm) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
				});
			}

			const rows = await db
				.select({
					id: character.id,
					name: character.name,
					gender: character.gender,
					referenceImageKey: character.referenceImageKey,
					croppedImageKey: character.croppedImageKey,
					createdAt: character.createdAt,
					updatedAt: character.updatedAt,
				})
				.from(character)
				.where(eq(character.realmId, realmId));

			const withUrls = await Promise.all(
				rows.map(async (row) => {
					if (!row.referenceImageKey) return row;
					const selectedKey = row.croppedImageKey ?? row.referenceImageKey;
					try {
						const url = await getFileUrl(selectedKey);
						return { ...row, referenceImageKey: url };
					} catch {
						return { ...row, referenceImageKey: null };
					}
				}),
			);

			return withUrls;
		}),

	update: protectedProcedure
		.input(characterUpdateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { id, ...updates } = input;

			const [row] = await db
				.select({ realmId: character.realmId })
				.from(character)
				.where(eq(character.id, id))
				.limit(1);
			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Character not found",
				});
			}

			const [ownsRealm] = await db
				.select({ id: realm.id })
				.from(realm)
				.where(and(eq(realm.id, row.realmId), eq(realm.ownerId, userId)))
				.limit(1);
			if (!ownsRealm) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
				});
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

			const [ownsRealm] = await db
				.select({ id: realm.id })
				.from(realm)
				.where(and(eq(realm.id, row.realmId), eq(realm.ownerId, userId)))
				.limit(1);
			if (!ownsRealm) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
				});
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

			const [ownsRealm] = await db
				.select({ id: realm.id })
				.from(realm)
				.where(and(eq(realm.id, charRow.realmId), eq(realm.ownerId, userId)))
				.limit(1);
			if (!ownsRealm) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
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
