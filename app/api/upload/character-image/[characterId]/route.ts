import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db/index";
import { character } from "@/server/db/schema/character";
import { realmMember } from "@/server/db/schema/realmMember";
import {
	cropImage,
	determineExtension,
	isSupportedImageType,
	parseCropJson,
	unsupportedImageResponse,
} from "@/server/image-processing";
import { classifyImage } from "@/server/nsfw-classification";
import {
	deleteFile,
	existsFile,
	getFileUrl,
	getPublicFileUrl,
	uploadFile,
} from "@/server/storage";

type CharacterParams = { characterId: string };

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<CharacterParams> },
) {
	try {
		const { characterId } = await params;
		const formData = await req.formData();
		const file = formData.get("file");
		const cropJson = formData.get("crop");

		if (!(file instanceof File) && typeof cropJson !== "string") {
			return Response.json(
				{ error: "No file or crop provided" },
				{ status: 400 },
			);
		}

		const session = await auth.api.getSession({ headers: req.headers });
		if (!session?.user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
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
			return Response.json({ error: "Character not found" }, { status: 404 });
		}

		const [member] = await db
			.select({ id: realmMember.id })
			.from(realmMember)
			.where(
				and(
					eq(realmMember.realmId, charRow.realmId),
					eq(realmMember.userId, session.user.id),
				),
			)
			.limit(1);
		if (!member) {
			return Response.json({ error: "Not a realm member" }, { status: 403 });
		}

		let originalExt: string | null = null;
		let baseBuffer: Uint8Array | null = null;

		// Handle file upload
		if (file instanceof File) {
			const buffer = await file.arrayBuffer();
			baseBuffer = new Uint8Array(buffer);
			const mime = file.type || "";
			const filename = (file as unknown as { name?: string }).name || "";

			if (!isSupportedImageType(mime)) {
				return unsupportedImageResponse();
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
				return Response.json(
					{ error: "Original image not found" },
					{ status: 400 },
				);
			}
			const presigned = await getFileUrl(foundKey, { expiresIn: 60 });
			const resp = await fetch(presigned);
			if (!resp.ok) {
				return Response.json(
					{ error: "Failed to fetch original" },
					{ status: 502 },
				);
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

		// Classify the image for NSFW content (server-side)
		let isNsfw = false;
		if (baseBuffer) {
			try {
				const classification = await classifyImage(baseBuffer);
				isNsfw = classification.isNsfw;
				console.log(
					`NSFW classification for character ${characterId}: ${classification.topClass} (${(classification.confidence * 100).toFixed(1)}%) - isNsfw: ${isNsfw}`,
				);
			} catch (error) {
				console.error("NSFW classification failed:", error);
				// Default to false on error
				isNsfw = false;
			}
		}

		const finalOriginalKey = `character-images/${characterId}.${originalExt ?? "bin"}`;
		await db
			.update(character)
			.set({
				referenceImageKey: finalOriginalKey,
				croppedImageKey: croppedKey,
				isNsfw,
			})
			.where(eq(character.id, characterId));

		const url = getPublicFileUrl(croppedKey ?? finalOriginalKey);
		return Response.json({
			success: true,
			imageKey: finalOriginalKey,
			croppedKey,
			url,
			isNsfw,
		});
	} catch (error) {
		console.error("Character image upload failed:", error);
		return Response.json({ error: "File upload failed" }, { status: 500 });
	}
}

export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<CharacterParams> },
) {
	try {
		const { characterId } = await params;

		const session = await auth.api.getSession({ headers: req.headers });
		if (!session?.user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

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
			return Response.json({ error: "Character not found" }, { status: 404 });
		}

		const [member] = await db
			.select({ id: realmMember.id })
			.from(realmMember)
			.where(
				and(
					eq(realmMember.realmId, charRow.realmId),
					eq(realmMember.userId, session.user.id),
				),
			)
			.limit(1);
		if (!member) {
			return Response.json({ error: "Not a realm member" }, { status: 403 });
		}

		if (!charRow.imageKey) {
			return Response.json(
				{ error: "Character has no image to delete" },
				{ status: 400 },
			);
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
				isNsfw: false,
			})
			.where(eq(character.id, characterId));

		return Response.json({ success: true });
	} catch (error) {
		console.error("Character image deletion failed:", error);
		return Response.json({ error: "Image deletion failed" }, { status: 500 });
	}
}
