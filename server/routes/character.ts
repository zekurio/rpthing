import { and, eq, inArray } from "drizzle-orm";
import { Elysia } from "elysia";
import { auth } from "@/server/auth";
import { db } from "@/server/db/index";
import { user } from "@/server/db/schema/auth";
import { character } from "@/server/db/schema/character";
import { realmMember } from "@/server/db/schema/realmMember";
import { characterTraitRating, trait } from "@/server/db/schema/traits";
import {
	characterCreateInputSchema,
	characterIdOnlySchema,
	characterListInputSchema,
	characterUpdateInputSchema,
} from "@/server/db/types";
import { deleteFile, getPublicFileUrl } from "@/server/storage";

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

export const characterRoutes = new Elysia({ prefix: "/character" })
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
	// POST /api/character - Create a new character
	.post(
		"/",
		async ({ body, user: currentUser, status }) => {
			const parsed = characterCreateInputSchema.safeParse(body);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { realmId, ...rest } = parsed.data;
			const userId = currentUser.id;

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, realmId);
			if (!isMember) {
				return status(403, { error: "Not a realm member" });
			}

			const [created] = await db
				.insert(character)
				.values({ realmId, userId, ...rest })
				.returning();
			return created;
		},
		{ isAuthenticated: true },
	)
	// GET /api/character - List characters for a realm
	.get(
		"/",
		async ({ query, user: currentUser, status }) => {
			const parsed = characterListInputSchema.safeParse(query);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { realmId } = parsed.data;
			const userId = currentUser.id;

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, realmId);
			if (!isMember) {
				return status(403, { error: "Not a realm member" });
			}

			const rows = await db
				.select({
					id: character.id,
					realmId: character.realmId,
					name: character.name,
					gender: character.gender,
					referenceImageKey: character.referenceImageKey,
					croppedImageKey: character.croppedImageKey,
					notes: character.notes,
					userId: character.userId,
					userName: user.name,
					createdAt: character.createdAt,
					updatedAt: character.updatedAt,
				})
				.from(character)
				.leftJoin(user, eq(user.id, character.userId))
				.where(eq(character.realmId, realmId));

			// Gather ratings summary for all characters in one query to avoid N+1
			const characterIds = rows.map((r) => r.id);
			let ratingsByCharacter: Record<
				string,
				Array<{
					traitId: string;
					traitName: string;
					description: string | null;
					displayMode: "number" | "grade";
					ratingId: string | null;
					value: number | null;
				}>
			> = {};
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
					.reduce(
						(acc, row) => {
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
						},
						{} as typeof ratingsByCharacter,
					);
			}

			// Generate public URLs for character images (with cache-busting) and attach ratings summary
			const withUrls = rows.map((row) => {
				const versionParam = row.updatedAt.getTime();
				const referenceUrl = row.referenceImageKey
					? `${getPublicFileUrl(row.referenceImageKey)}?v=${versionParam}`
					: null;
				const croppedUrl = row.croppedImageKey
					? `${getPublicFileUrl(row.croppedImageKey)}?v=${versionParam}`
					: null;
				return {
					...row,
					referenceImageKey: referenceUrl,
					croppedImageKey: croppedUrl,
					ratingsSummary: ratingsByCharacter[row.id] ?? [],
				};
			});

			return withUrls;
		},
		{ isAuthenticated: true },
	)
	// GET /api/character/:id - Get a single character by ID
	.get(
		"/:id",
		async ({ params, user: currentUser, status }) => {
			const parsed = characterIdOnlySchema.safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const userId = currentUser.id;

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
				.where(eq(character.id, params.id))
				.limit(1);
			if (!row) {
				return null;
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, row.realmId);
			if (!isMember) {
				return null;
			}

			// Generate public URLs for character images with cache-busting
			const versionParam = row.updatedAt.getTime();
			const referenceUrl = row.referenceImageKey
				? `${getPublicFileUrl(row.referenceImageKey)}?v=${versionParam}`
				: null;
			const croppedUrl = row.croppedImageKey
				? `${getPublicFileUrl(row.croppedImageKey)}?v=${versionParam}`
				: null;
			return {
				...row,
				referenceImageKey: referenceUrl,
				croppedImageKey: croppedUrl,
			};
		},
		{ isAuthenticated: true },
	)
	// GET /api/character/:id/ratings - Get a character with all its ratings
	.get(
		"/:id/ratings",
		async ({ params, user: currentUser, status }) => {
			const parsed = characterIdOnlySchema.safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const userId = currentUser.id;

			const [charRow] = await db
				.select({
					id: character.id,
					realmId: character.realmId,
					name: character.name,
				})
				.from(character)
				.where(eq(character.id, params.id))
				.limit(1);
			if (!charRow) {
				return null;
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, charRow.realmId);
			if (!isMember) {
				return null;
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
						eq(characterTraitRating.characterId, params.id),
					),
				)
				.where(eq(trait.realmId, charRow.realmId));

			return { ...charRow, traits: rows };
		},
		{ isAuthenticated: true },
	)
	// PATCH /api/character/:id - Update a character
	.patch(
		"/:id",
		async ({ params, body, user: currentUser, status }) => {
			const parsed = characterUpdateInputSchema.safeParse({
				...(body as Record<string, unknown>),
				id: params.id,
			});
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const { id, realmId: newRealmId, ...updates } = parsed.data;
			const userId = currentUser.id;

			const [row] = await db
				.select({ realmId: character.realmId })
				.from(character)
				.where(eq(character.id, id))
				.limit(1);
			if (!row) {
				return status(404, { error: "Character not found" });
			}

			// Check if user is a member of the current realm
			const isMemberOfCurrentRealm = await isRealmMember(userId, row.realmId);
			if (!isMemberOfCurrentRealm) {
				return status(403, { error: "Not a realm member" });
			}

			const unmappedTraits: string[] = [];

			// If moving to a new realm, check membership in the target realm and migrate ratings
			if (newRealmId && newRealmId !== row.realmId) {
				const isMemberOfNewRealm = await isRealmMember(userId, newRealmId);
				if (!isMemberOfNewRealm) {
					return status(403, { error: "Not a member of the target realm" });
				}

				// Get old ratings with trait names
				const oldRatings = await db
					.select({
						ratingId: characterTraitRating.id,
						traitId: characterTraitRating.traitId,
						traitName: trait.name,
						value: characterTraitRating.value,
					})
					.from(characterTraitRating)
					.innerJoin(trait, eq(trait.id, characterTraitRating.traitId))
					.where(eq(characterTraitRating.characterId, id));

				// Get traits in the new realm
				const newRealmTraits = await db
					.select({
						id: trait.id,
						name: trait.name,
					})
					.from(trait)
					.where(eq(trait.realmId, newRealmId));

				// Create a map of lowercase trait names to trait IDs in the new realm
				const newTraitMap = new Map<string, string>();
				for (const t of newRealmTraits) {
					newTraitMap.set(t.name.toLowerCase(), t.id);
				}

				// Migrate ratings by matching trait names
				const ratingsToCreate: Array<{
					characterId: string;
					traitId: string;
					value: number;
				}> = [];
				const ratingIdsToDelete: string[] = [];

				for (const oldRating of oldRatings) {
					const matchingTraitId = newTraitMap.get(
						oldRating.traitName.toLowerCase(),
					);
					if (matchingTraitId && oldRating.value !== null) {
						ratingsToCreate.push({
							characterId: id,
							traitId: matchingTraitId,
							value: oldRating.value,
						});
					} else if (!matchingTraitId && oldRating.value !== null) {
						unmappedTraits.push(oldRating.traitName);
					}
					ratingIdsToDelete.push(oldRating.ratingId);
				}

				// Delete old ratings
				if (ratingIdsToDelete.length > 0) {
					await db
						.delete(characterTraitRating)
						.where(inArray(characterTraitRating.id, ratingIdsToDelete));
				}

				// Create new ratings in the target realm
				if (ratingsToCreate.length > 0) {
					await db
						.insert(characterTraitRating)
						.values(ratingsToCreate)
						.onConflictDoNothing();
				}

				// Update character with new realm
				await db
					.update(character)
					.set({ ...updates, realmId: newRealmId })
					.where(eq(character.id, id));
			} else {
				await db.update(character).set(updates).where(eq(character.id, id));
			}

			return { success: true, unmappedTraits };
		},
		{ isAuthenticated: true },
	)
	// DELETE /api/character/:id - Delete a character
	.delete(
		"/:id",
		async ({ params, user: currentUser, status }) => {
			const parsed = characterIdOnlySchema.safeParse(params);
			if (!parsed.success) {
				return status(400, { error: parsed.error.message });
			}
			const userId = currentUser.id;

			const [row] = await db
				.select({
					realmId: character.realmId,
					referenceImageKey: character.referenceImageKey,
				})
				.from(character)
				.where(eq(character.id, params.id))
				.limit(1);
			if (!row) {
				return status(404, { error: "Character not found" });
			}

			// Check if user is a realm member
			const isMember = await isRealmMember(userId, row.realmId);
			if (!isMember) {
				return status(403, { error: "Not a realm member" });
			}

			// Attempt to delete stored image(s) if present (best-effort)
			const keys = new Set<string>();
			if (row.referenceImageKey) {
				keys.add(row.referenceImageKey);
				const ext = row.referenceImageKey.split(".").pop();
				const baseKey = row.referenceImageKey.replace(/\.[^/.]+$/, "");
				keys.add(`${baseKey}-cropped.${ext}`);
			}
			for (const key of keys) {
				try {
					await deleteFile(key);
				} catch (err) {
					console.error(`Failed to delete character image ${key}:`, err);
				}
			}

			await db.delete(character).where(eq(character.id, params.id));
			return true;
		},
		{ isAuthenticated: true },
	);
