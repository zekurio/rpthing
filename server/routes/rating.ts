import { and, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db/index";
import { character } from "@/server/db/schema/character";
import { realmMember } from "@/server/db/schema/realmMember";
import { characterTraitRating, trait } from "@/server/db/schema/traits";
import {
	mapGradeToValue,
	ratingCreateOrUpdateInputSchema,
	ratingGetByPairInputSchema,
	ratingIdSchema,
	ratingListByCharacterInputSchema,
} from "@/server/db/types";

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

export const ratingRoutes = new Elysia({ prefix: "/rating" })
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
	// PUT /api/rating - Create or update a rating
	.put(
		"/",
		async ({ body, user, status }) => {
			const parsed = ratingCreateOrUpdateInputSchema.safeParse(body);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { characterId, traitId, value } = parsed.data;
			const userId = user.id;

			const [charRow] = await db
				.select({ id: character.id, realmId: character.realmId })
				.from(character)
				.where(eq(character.id, characterId))
				.limit(1);

			if (!charRow) {
				return status(404, { error: "Character not found" });
			}

			const [traitRow] = await db
				.select({ id: trait.id, realmId: trait.realmId })
				.from(trait)
				.where(eq(trait.id, traitId))
				.limit(1);

			if (!traitRow) {
				return status(404, { error: "Trait not found" });
			}

			if (traitRow.realmId !== charRow.realmId) {
				return status(400, { error: "Mismatched realms" });
			}

			// Check if user is a realm member
			const isMember = await isRealmMember(userId, traitRow.realmId);
			if (!isMember) {
				return status(403, { error: "Not a realm member" });
			}

			const numericValue = mapGradeToValue(value);
			if (numericValue < 1 || numericValue > 20) {
				return status(400, { error: "Invalid rating value" });
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
		},
		{ isAuthenticated: true },
	)
	// GET /api/rating/:id - Get a rating by ID
	.get(
		"/:id",
		async ({ params, user, status }) => {
			const parsed = z.object({ id: ratingIdSchema }).safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const userId = user.id;

			const [row] = await db
				.select({
					id: characterTraitRating.id,
					characterId: characterTraitRating.characterId,
					traitId: characterTraitRating.traitId,
					value: characterTraitRating.value,
				})
				.from(characterTraitRating)
				.where(eq(characterTraitRating.id, params.id))
				.limit(1);

			if (!row) {
				return null;
			}

			const [charRow] = await db
				.select({ realmId: character.realmId })
				.from(character)
				.where(eq(character.id, row.characterId))
				.limit(1);

			if (!charRow) {
				return null;
			}

			// Check if user is a realm member
			const isMember = await isRealmMember(userId, charRow.realmId);
			if (!isMember) {
				return null;
			}

			return row;
		},
		{ isAuthenticated: true },
	)
	// GET /api/rating/pair - Get a rating by character and trait pair
	.get(
		"/pair",
		async ({ query, user, status }) => {
			const parsed = ratingGetByPairInputSchema.safeParse(query);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { characterId, traitId } = parsed.data;
			const userId = user.id;

			const [charRow] = await db
				.select({ id: character.id, realmId: character.realmId })
				.from(character)
				.where(eq(character.id, characterId))
				.limit(1);
			if (!charRow) {
				return null;
			}

			const [traitRow] = await db
				.select({ id: trait.id, realmId: trait.realmId })
				.from(trait)
				.where(eq(trait.id, traitId))
				.limit(1);
			if (!traitRow) {
				return null;
			}

			if (traitRow.realmId !== charRow.realmId) {
				return null;
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

			// Check if user is a realm member
			const isMember = await isRealmMember(userId, charRow.realmId);
			if (!isMember) {
				return null;
			}

			return row;
		},
		{ isAuthenticated: true },
	)
	// GET /api/rating/character/:characterId - List all ratings for a character
	.get(
		"/character/:characterId",
		async ({ params, user, status }) => {
			const parsed = ratingListByCharacterInputSchema.safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { characterId } = parsed.data;
			const userId = user.id;

			const [charRow] = await db
				.select({ realmId: character.realmId })
				.from(character)
				.where(eq(character.id, characterId))
				.limit(1);

			if (!charRow) {
				return status(404, { error: "Character not found" });
			}

			// Check if user is a realm member
			const isMember = await isRealmMember(userId, charRow.realmId);
			if (!isMember) {
				return status(403, { error: "Not a realm member" });
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
		},
		{ isAuthenticated: true },
	)
	// DELETE /api/rating/:id - Delete a rating
	.delete(
		"/:id",
		async ({ params, user, status }) => {
			const parsed = z.object({ id: ratingIdSchema }).safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const userId = user.id;

			const [row] = await db
				.select({
					id: characterTraitRating.id,
					characterId: characterTraitRating.characterId,
				})
				.from(characterTraitRating)
				.where(eq(characterTraitRating.id, params.id))
				.limit(1);

			if (!row) {
				return status(404, { error: "Rating not found" });
			}

			const [charRow] = await db
				.select({ realmId: character.realmId })
				.from(character)
				.where(eq(character.id, row.characterId))
				.limit(1);

			if (!charRow) {
				return status(404, { error: "Character not found" });
			}

			// Check if user is a realm member
			const isMember = await isRealmMember(userId, charRow.realmId);
			if (!isMember) {
				return status(403, { error: "Not a realm member" });
			}

			await db
				.delete(characterTraitRating)
				.where(eq(characterTraitRating.id, params.id));
			return true;
		},
		{ isAuthenticated: true },
	);
