import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { db } from "../db";
import { character, realm, realmMember } from "../db/schema/rp";
import { deleteFile, getFileUrl, uploadFile } from "../lib/storage";
import { protectedProcedure, router } from "../lib/trpc";
import {
	realmCreateInputSchema,
	realmDeleteIconInputSchema,
	realmIdSchema,
	realmJoinInputSchema,
	realmTransferOwnershipInputSchema,
	realmUpdateIconInputSchema,
	realmUpdateInputSchema,
} from "../schemas";

const decodeBase64ImageToPng = async (
	imageBase64: string,
): Promise<Uint8Array> => {
	const base64 = imageBase64.includes(",")
		? (imageBase64.split(",", 2)[1] ?? "")
		: imageBase64;
	let bytes: Uint8Array;
	try {
		bytes = Buffer.from(base64, "base64");
	} catch {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Invalid base64 data",
		});
	}

	try {
		const pngBuffer = await sharp(bytes).png().toBuffer();
		return pngBuffer;
	} catch (error) {
		console.error("PNG conversion failed", error);
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Failed to process image",
		});
	}
};

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

			// Handle icon upload if provided
			if (input.imageBase64) {
				try {
					const iconKey = `/realm-icons/${created.id}.png`;
					const pngBytes = await decodeBase64ImageToPng(input.imageBase64);
					await uploadFile(iconKey, pngBytes, "image/png");
					await db
						.update(realm)
						.set({ iconKey })
						.where(eq(realm.id, created.id));
				} catch (error) {
					// Log the error but don't fail the realm creation
					console.error(
						`Failed to upload icon for realm ${created.id}:`,
						error,
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
				role: realmMember.role,
			})
			.from(realmMember)
			.innerJoin(realm, eq(realm.id, realmMember.realmId))
			.where(eq(realmMember.userId, userId));

		return rows;
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
			const stableIconKey = `/realm-icons/${input}.png`;
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

			// Handle icon operations
			if (updates.imageBase64 !== undefined) {
				if (updates.imageBase64 === "REMOVE_ICON") {
					// Remove existing icon
					if (r.iconKey) {
						try {
							await deleteFile(r.iconKey);
						} catch (error) {
							console.error(`Failed to delete icon for realm ${id}:`, error);
							// Don't fail the update if icon deletion fails
						}
					}
					updateData.iconKey = null;
				} else if (updates.imageBase64) {
					// Upload new icon
					try {
						const iconKey = `/realm-icons/${id}.png`;
						const pngBytes = await decodeBase64ImageToPng(updates.imageBase64);
						await uploadFile(iconKey, pngBytes, "image/png");
						updateData.iconKey = iconKey;
					} catch (error) {
						console.error(`Failed to upload icon for realm ${id}:`, error);
						// Don't fail the update if icon upload fails
					}
				}
			}

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

	uploadIcon: protectedProcedure
		.input(realmUpdateIconInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId, imageBase64 } = input;

			// Check if user is the owner
			const [r] = await db
				.select({ ownerId: realm.ownerId, iconKey: realm.iconKey })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!r) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Realm not found" });
			}

			if (r.ownerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the realm owner can update the icon",
				});
			}

			// Use a stable key per realm, saved as a PNG
			const iconKey = `/realm-icons/${realmId}.png`;

			// Schema guarantees a string; convert and upload
			const pngBytes = await decodeBase64ImageToPng(imageBase64);
			try {
				await uploadFile(iconKey, pngBytes, "image/png");
			} catch (error) {
				console.error("Icon upload failed", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to upload icon",
				});
			}

			// Update the database with the new icon key
			await db.update(realm).set({ iconKey }).where(eq(realm.id, realmId));

			return {
				success: true,
				iconKey,
				uploadUrl: await getFileUrl(iconKey),
			};
		}),

	deleteIcon: protectedProcedure
		.input(realmDeleteIconInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId } = input;

			// Check if user is the owner
			const [r] = await db
				.select({ ownerId: realm.ownerId, iconKey: realm.iconKey })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!r) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Realm not found" });
			}

			if (r.ownerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the realm owner can delete the icon",
				});
			}

			if (!r.iconKey) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Realm has no icon to delete",
				});
			}

			// Delete the file from storage
			try {
				await deleteFile(r.iconKey);
			} catch (error) {
				// Log the error but continue with database update
				console.error(`Failed to delete icon file ${r.iconKey}:`, error);
			}

			// Remove icon from database
			await db
				.update(realm)
				.set({ iconKey: null })
				.where(eq(realm.id, realmId));

			return { success: true };
		}),

	getIconUrl: protectedProcedure
		.input(realmIdSchema)
		.query(async ({ input }) => {
			const realmId = input;

			// Get the icon key for this realm
			const [r] = await db
				.select({ iconKey: realm.iconKey })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!r || !r.iconKey) {
				return { url: null };
			}

			const url = await getFileUrl(r.iconKey);
			return { url };
		}),
});
