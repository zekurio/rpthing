import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { auth } from "@/server/auth";
import { db } from "@/server/db/index";
import { character } from "@/server/db/schema/character";
import { realm } from "@/server/db/schema/realm";
import { realmMember } from "@/server/db/schema/realmMember";
import {
	cropImage,
	determineExtension,
	isSupportedImageType,
	parseCropJson,
} from "@/server/image-processing";
import {
	deleteFile,
	existsFile,
	getFileUrl,
	getPublicFileUrl,
	uploadFile,
} from "@/server/storage";

export const uploadRoutes = new Elysia({ prefix: "/upload" })
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
	// POST /api/upload/character-image/:characterId - Upload/update character image
	.post(
		"/character-image/:characterId",
		async ({ params, body, user, status }) => {
			try {
				const { characterId } = params;
				const file = body.file;
				const cropJson = body.crop;

				if (!(file instanceof File) && typeof cropJson !== "string") {
					return status(400, { error: "No file or crop provided" });
				}

				const [charRow] = await db
					.select({
						realmId: character.realmId,
						referenceImageKey: character.referenceImageKey,
						croppedImageKey: character.croppedImageKey,
					})
					.from(character)
					.where(eq(character.id, characterId))
					.limit(1);
				if (!charRow) {
					return status(404, { error: "Character not found" });
				}

				const [member] = await db
					.select({ id: realmMember.id })
					.from(realmMember)
					.where(
						and(
							eq(realmMember.realmId, charRow.realmId),
							eq(realmMember.userId, user.id),
						),
					)
					.limit(1);
				if (!member) {
					return status(403, { error: "Not a realm member" });
				}

				let originalExt: string | null = null;
				let baseBuffer: Uint8Array | null = null;

				// Handle file upload
				if (file instanceof File) {
					const buffer = await file.arrayBuffer();
					baseBuffer = new Uint8Array(buffer);
					const mime = file.type || "";
					const filename = file.name || "";

					if (!isSupportedImageType(mime)) {
						return status(415, {
							error:
								"Unsupported image format. Please use PNG, JPEG, WebP, or AVIF.",
						});
					}

					originalExt = determineExtension(mime, filename);

					const originalKey = `character-images/${characterId}.${originalExt}`;

					// Delete old files if extension changed
					if (
						charRow.referenceImageKey &&
						charRow.referenceImageKey !== originalKey
					) {
						try {
							await deleteFile(charRow.referenceImageKey);
						} catch {
							// Ignore if file doesn't exist
						}
					}
					if (charRow.croppedImageKey) {
						try {
							await deleteFile(charRow.croppedImageKey);
						} catch {
							// Ignore if file doesn't exist
						}
					}

					await uploadFile(originalKey, baseBuffer, {
						contentType: mime || undefined,
						cacheControl: "public, max-age=31536000, immutable",
					});
				} else {
					// No new file - try to find existing original
					const tryExts = ["png", "jpg", "jpeg", "webp", "avif", "bin"];
					let foundKey: string | null = null;
					for (const ext of tryExts) {
						const key = `character-images/${characterId}.${ext}`;
						if (await existsFile(key)) {
							foundKey = key;
							originalExt = ext;
							break;
						}
					}
					if (!foundKey) {
						return status(400, { error: "Original image not found" });
					}
					const presigned = await getFileUrl(foundKey, { expiresIn: 60 });
					const resp = await fetch(presigned);
					if (!resp.ok) {
						return status(502, { error: "Failed to fetch original" });
					}
					const buf = await resp.arrayBuffer();
					baseBuffer = new Uint8Array(buf);
				}

				// Process crop if provided
				let croppedKey: string | null = null;
				if (typeof cropJson === "string" && baseBuffer && originalExt) {
					const crop = parseCropJson(cropJson);
					if (crop) {
						const cropped = await cropImage(baseBuffer, crop, originalExt);
						if (cropped) {
							croppedKey = `character-images/${characterId}-cropped.${cropped.extension}`;
							await uploadFile(croppedKey, cropped.buffer, {
								contentType: cropped.mimeType,
								cacheControl: "public, max-age=31536000, immutable",
							});
						}
					}
				}

				const finalOriginalKey = `character-images/${characterId}.${originalExt ?? "bin"}`;
				await db
					.update(character)
					.set({
						referenceImageKey: finalOriginalKey,
						croppedImageKey: croppedKey,
					})
					.where(eq(character.id, characterId));

				const url = getPublicFileUrl(croppedKey ?? finalOriginalKey);
				return {
					success: true,
					imageKey: finalOriginalKey,
					croppedKey,
					url,
				};
			} catch (error) {
				console.error("Character image upload failed:", error);
				return status(500, { error: "File upload failed" });
			}
		},
		{
			isAuthenticated: true,
			body: t.Object({
				file: t.Optional(t.File()),
				crop: t.Optional(t.String()),
			}),
		},
	)
	// DELETE /api/upload/character-image/:characterId - Delete character image
	.delete(
		"/character-image/:characterId",
		async ({ params, user, status }) => {
			try {
				const { characterId } = params;

				const [charRow] = await db
					.select({
						realmId: character.realmId,
						imageKey: character.referenceImageKey,
						croppedKey: character.croppedImageKey,
					})
					.from(character)
					.where(eq(character.id, characterId))
					.limit(1);
				if (!charRow) {
					return status(404, { error: "Character not found" });
				}

				const [member] = await db
					.select({ id: realmMember.id })
					.from(realmMember)
					.where(
						and(
							eq(realmMember.realmId, charRow.realmId),
							eq(realmMember.userId, user.id),
						),
					)
					.limit(1);
				if (!member) {
					return status(403, { error: "Not a realm member" });
				}

				if (!charRow.imageKey) {
					return status(400, { error: "Character has no image to delete" });
				}

				// Collect all possible keys to delete
				const keysToDelete = new Set<string>();
				if (charRow.imageKey) keysToDelete.add(charRow.imageKey);
				if (charRow.croppedKey) keysToDelete.add(charRow.croppedKey);

				// Also try common extensions in case DB is out of sync
				const commonExts = ["png", "jpg", "jpeg", "webp", "avif"];
				for (const ext of commonExts) {
					keysToDelete.add(`character-images/${characterId}.${ext}`);
					keysToDelete.add(`character-images/${characterId}-cropped.${ext}`);
				}

				for (const key of keysToDelete) {
					try {
						await deleteFile(key);
					} catch (error) {
						// Ignore errors for files that may not exist
						console.debug(`Failed to delete character image ${key}:`, error);
					}
				}

				await db
					.update(character)
					.set({
						referenceImageKey: null,
						croppedImageKey: null,
					})
					.where(eq(character.id, characterId));

				return { success: true };
			} catch (error) {
				console.error("Character image deletion failed:", error);
				return status(500, { error: "Image deletion failed" });
			}
		},
		{ isAuthenticated: true },
	)
	// POST /api/upload/realm-icon/:realmId - Upload/update realm icon
	.post(
		"/realm-icon/:realmId",
		async ({ params, body, user, status }) => {
			try {
				const { realmId } = params;
				const file = body.file;
				const cropJson = body.crop;

				if (!(file instanceof File)) {
					return status(400, { error: "No file provided" });
				}

				const [r] = await db
					.select({ ownerId: realm.ownerId, iconKey: realm.iconKey })
					.from(realm)
					.where(eq(realm.id, realmId))
					.limit(1);

				if (!r) {
					return status(404, { error: "Realm not found" });
				}

				if (r.ownerId !== user.id) {
					return status(403, { error: "Forbidden" });
				}

				const originalBuffer = new Uint8Array(await file.arrayBuffer());
				const mime = file.type || "";
				const filename = file.name || "";

				if (!isSupportedImageType(mime)) {
					return status(415, {
						error:
							"Unsupported image format. Please use PNG, JPEG, WebP, or AVIF.",
					});
				}

				let ext = determineExtension(mime, filename);
				let finalBuffer: Uint8Array = originalBuffer;

				// Process crop if provided
				if (typeof cropJson === "string") {
					const crop = parseCropJson(cropJson);
					if (crop) {
						const cropped = await cropImage(originalBuffer, crop, ext);
						if (cropped) {
							finalBuffer = cropped.buffer;
							ext = cropped.extension;
						}
					}
				}

				// Delete old icon if it exists and has a different extension
				if (r.iconKey) {
					const oldExt = r.iconKey.split(".").pop()?.toLowerCase();
					if (oldExt !== ext) {
						try {
							await deleteFile(r.iconKey);
						} catch (error) {
							console.error(`Failed to delete old icon ${r.iconKey}:`, error);
						}
					}
				}

				const iconKey = `realm-icons/${realmId}.${ext}`;
				await uploadFile(iconKey, finalBuffer, {
					contentType: mime || `image/${ext}`,
					cacheControl: "public, max-age=31536000, immutable",
				});

				await db.update(realm).set({ iconKey }).where(eq(realm.id, realmId));

				const url = getPublicFileUrl(iconKey);
				return { success: true, iconKey, url };
			} catch (error) {
				console.error("Realm icon upload failed:", error);
				return status(500, { error: "File upload failed" });
			}
		},
		{
			isAuthenticated: true,
			body: t.Object({
				file: t.File(),
				crop: t.Optional(t.String()),
			}),
		},
	)
	// DELETE /api/upload/realm-icon/:realmId - Delete realm icon
	.delete(
		"/realm-icon/:realmId",
		async ({ params, user, status }) => {
			try {
				const { realmId } = params;

				const [r] = await db
					.select({ ownerId: realm.ownerId, iconKey: realm.iconKey })
					.from(realm)
					.where(eq(realm.id, realmId))
					.limit(1);

				if (!r) {
					return status(404, { error: "Realm not found" });
				}

				if (r.ownerId !== user.id) {
					return status(403, { error: "Forbidden" });
				}

				if (!r.iconKey) {
					return status(400, { error: "Realm has no icon to delete" });
				}

				try {
					await deleteFile(r.iconKey);
				} catch (error) {
					console.error(`Failed to delete icon file ${r.iconKey}:`, error);
				}

				await db
					.update(realm)
					.set({ iconKey: null })
					.where(eq(realm.id, realmId));

				return { success: true };
			} catch (error) {
				console.error("Realm icon deletion failed:", error);
				return status(500, { error: "Icon deletion failed" });
			}
		},
		{ isAuthenticated: true },
	);
