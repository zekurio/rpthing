import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index";
import { character } from "../db/schema/character";
import { realmMember } from "../db/schema/realmMember";
import { characterTraitRating, trait } from "../db/schema/traits";
import { protectedProcedure, router } from "../lib/trpc";
import {
	ratingCreateOrUpdateInputSchema,
	ratingGetByPairInputSchema,
	ratingIdSchema,
	ratingListByCharacterInputSchema,
	TRAIT_GRADES,
} from "../schemas/traits";

function mapGradeToValue(
	value: number | (typeof TRAIT_GRADES)[number],
): number {
	if (typeof value === "number") return value;
	const idx = TRAIT_GRADES.indexOf(value);
	return idx + 1; // 1..20
}

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

export const ratingRouter = router({
	upsert: protectedProcedure
		.input(ratingCreateOrUpdateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { characterId, traitId, value } = input;

			const [charRow] = await db
				.select({ id: character.id, realmId: character.realmId })
				.from(character)
				.where(eq(character.id, characterId))
				.limit(1);

			if (!charRow) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Character not found",
				});
			}

			const [traitRow] = await db
				.select({ id: trait.id, realmId: trait.realmId })
				.from(trait)
				.where(eq(trait.id, traitId))
				.limit(1);

			if (!traitRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Trait not found" });
			}

			if (traitRow.realmId !== charRow.realmId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Mismatched realms",
				});
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, traitRow.realmId);
			if (!isMember) {
				// Allow if character owner (even if not realm member)
				const [charInfo] = await db
					.select({ ownerId: character.userId })
					.from(character)
					.where(eq(character.id, characterId))
					.limit(1);
				if (charInfo?.ownerId !== userId) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Not permitted",
					});
				}
			}

			const numericValue = mapGradeToValue(value);
			if (numericValue < 1 || numericValue > 20) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid rating value",
				});
			}

			const [existing] = await db
				.select({ id: characterTraitRating.id })
				.from(characterTraitRating)
				.where(
					and(
						eq(characterTraitRating.characterId, characterId),
						eq(characterTraitRating.traitId, traitId),
					),
				)
				.limit(1);

			if (existing) {
				await db
					.update(characterTraitRating)
					.set({ value: numericValue })
					.where(eq(characterTraitRating.id, existing.id));
				return { success: true, id: existing.id };
			}

			const [created] = await db
				.insert(characterTraitRating)
				.values({ characterId, traitId, value: numericValue })
				.returning();
			return created;
		}),

	getById: protectedProcedure
		.input(ratingIdSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [row] = await db
				.select({
					id: characterTraitRating.id,
					characterId: characterTraitRating.characterId,
					traitId: characterTraitRating.traitId,
					value: characterTraitRating.value,
				})
				.from(characterTraitRating)
				.where(eq(characterTraitRating.id, input))
				.limit(1);

			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Rating not found" });
			}

			const [charRow] = await db
				.select({ realmId: character.realmId })
				.from(character)
				.where(eq(character.id, row.characterId))
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

			return row;
		}),

	getByPair: protectedProcedure
		.input(ratingGetByPairInputSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { characterId, traitId } = input;

			const [charRow] = await db
				.select({ id: character.id, realmId: character.realmId })
				.from(character)
				.where(eq(character.id, characterId))
				.limit(1);
			if (!charRow) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Character not found",
				});
			}

			const [traitRow] = await db
				.select({ id: trait.id, realmId: trait.realmId })
				.from(trait)
				.where(eq(trait.id, traitId))
				.limit(1);
			if (!traitRow) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Trait not found" });
			}

			if (traitRow.realmId !== charRow.realmId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Mismatched realms",
				});
			}

			const [row] = await db
				.select({
					id: characterTraitRating.id,
					characterId: characterTraitRating.characterId,
					traitId: characterTraitRating.traitId,
					value: characterTraitRating.value,
				})
				.from(characterTraitRating)
				.where(
					and(
						eq(characterTraitRating.characterId, characterId),
						eq(characterTraitRating.traitId, traitId),
					),
				)
				.limit(1);

			if (!row) return null;

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, charRow.realmId);
			if (!isMember) {
				// Allow if character owner (even if not realm member)
				const [charInfo] = await db
					.select({ ownerId: character.userId })
					.from(character)
					.where(eq(character.id, characterId))
					.limit(1);
				if (charInfo?.ownerId !== userId) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Not permitted",
					});
				}
			}

			return row;
		}),

	listByCharacter: protectedProcedure
		.input(ratingListByCharacterInputSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { characterId } = input;

			const [charRow] = await db
				.select({ realmId: character.realmId })
				.from(character)
				.where(eq(character.id, characterId))
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
				// Allow if character owner (even if not realm member)
				const [charInfo] = await db
					.select({ ownerId: character.userId })
					.from(character)
					.where(eq(character.id, characterId))
					.limit(1);
				if (charInfo?.ownerId !== userId) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Not permitted",
					});
				}
			}

			return await db
				.select({
					id: characterTraitRating.id,
					traitId: characterTraitRating.traitId,
					value: characterTraitRating.value,
					createdAt: characterTraitRating.createdAt,
					updatedAt: characterTraitRating.updatedAt,
				})
				.from(characterTraitRating)
				.where(eq(characterTraitRating.characterId, characterId));
		}),

	delete: protectedProcedure
		.input(ratingIdSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [row] = await db
				.select({
					id: characterTraitRating.id,
					characterId: characterTraitRating.characterId,
				})
				.from(characterTraitRating)
				.where(eq(characterTraitRating.id, input))
				.limit(1);

			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Rating not found" });
			}

			const [charRow] = await db
				.select({ realmId: character.realmId })
				.from(character)
				.where(eq(character.id, row.characterId))
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

			await db
				.delete(characterTraitRating)
				.where(eq(characterTraitRating.id, input));
			return true;
		}),
});
