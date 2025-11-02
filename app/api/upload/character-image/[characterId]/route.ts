import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import sharp from "sharp";
import { auth } from "@/server/auth";
import { db } from "@/server/db/index";
import { character } from "@/server/db/schema/character";
import { realmMember } from "@/server/db/schema/realmMember";
import {
	deleteFile,
	existsFile,
	getFileUrl,
	getPublicFileUrl,
	uploadFile,
} from "@/server/storage";

const unsupportedImageResponse = Response.json(
	{ error: "Only non-GIF image uploads are allowed" },
	{ status: 415 },
);

const extensionFromMime = (mime: string) => {
	switch (mime) {
		case "image/png":
			return "png";
		case "image/jpeg":
			return "jpg";
		case "image/webp":
			return "webp";
		case "image/avif":
			return "avif";
		case "image/gif":
			return "gif";
		default:
			return "";
	}
};

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
			.select({ realmId: character.realmId })
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

		if (file instanceof File) {
			const buffer = await file.arrayBuffer();
			baseBuffer = new Uint8Array(buffer);
			const mime = file.type || "";
			if (!mime.startsWith("image/") || mime === "image/gif") {
				return unsupportedImageResponse;
			}
			const name =
				(file as unknown as { name?: string }).name?.toLowerCase() ?? "";
			const nameExt = (() => {
				const idx = name.lastIndexOf(".");
				return idx >= 0 ? name.slice(idx + 1) : "";
			})();
			const extFromMime = extensionFromMime(mime);
			originalExt = (extFromMime || nameExt || "bin").toLowerCase();

			const originalKey = `character-images/${characterId}.${originalExt}`;
			await uploadFile(originalKey, baseBuffer, {
				contentType: mime || undefined,
				cacheControl: "public, max-age=31536000, immutable",
			});
		} else {
			const tryExts = ["png", "jpg", "jpeg", "webp", "avif", "gif", "bin"];
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

		let croppedKey: string | null = null;
		if (typeof cropJson === "string") {
			try {
				const crop = JSON.parse(cropJson) as {
					unit?: string;
					x?: number;
					y?: number;
					width?: number;
					height?: number;
				};
				if (
					crop &&
					crop.unit === "%" &&
					typeof crop.x === "number" &&
					typeof crop.y === "number" &&
					typeof crop.width === "number" &&
					typeof crop.height === "number" &&
					baseBuffer
				) {
					const base = sharp(baseBuffer);
					const meta = await base.metadata();
					const srcWidth = meta.width ?? 0;
					const srcHeight = meta.height ?? 0;
					if (srcWidth > 0 && srcHeight > 0) {
						const left = Math.max(0, Math.round((crop.x / 100) * srcWidth));
						const top = Math.max(0, Math.round((crop.y / 100) * srcHeight));
						const width = Math.max(
							1,
							Math.round((crop.width / 100) * srcWidth),
						);
						const height = Math.max(
							1,
							Math.round((crop.height / 100) * srcHeight),
						);
						const boundedLeft = Math.min(left, Math.max(0, srcWidth - 1));
						const boundedTop = Math.min(top, Math.max(0, srcHeight - 1));
						const boundedWidth = Math.min(width, srcWidth - boundedLeft);
						const boundedHeight = Math.min(height, srcHeight - boundedTop);
						const pipeline = base.extract({
							left: boundedLeft,
							top: boundedTop,
							width: boundedWidth,
							height: boundedHeight,
						});
						let croppedBuf: Uint8Array;
						switch ((originalExt || "").toLowerCase()) {
							case "jpg":
							case "jpeg":
								croppedBuf = await pipeline.jpeg().toBuffer();
								break;
							case "png":
								croppedBuf = await pipeline.png().toBuffer();
								break;
							case "webp":
								croppedBuf = await pipeline.webp().toBuffer();
								break;
							case "avif":
								croppedBuf = await pipeline.avif().toBuffer();
								break;
							case "gif":
								croppedBuf = await pipeline.png().toBuffer();
								originalExt = "png";
								break;
							default:
								croppedBuf = await pipeline.png().toBuffer();
								originalExt = "png";
						}
						croppedKey = `character-images/${characterId}-cropped.${originalExt}`;
						const croppedMime = (() => {
							switch ((originalExt || "").toLowerCase()) {
								case "jpg":
								case "jpeg":
									return "image/jpeg";
								case "png":
									return "image/png";
								case "webp":
									return "image/webp";
								case "avif":
									return "image/avif";
								default:
									return "image/png";
							}
						})();
						await uploadFile(croppedKey, croppedBuf, {
							contentType: croppedMime,
							cacheControl: "public, max-age=31536000, immutable",
						});
					}
				}
			} catch (error) {
				console.error("Failed to process character crop:", error);
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
		return Response.json({
			success: true,
			imageKey: finalOriginalKey,
			croppedKey,
			url,
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

		const originalKey = `character-images/${characterId}.png`;
		const croppedKey = `character-images/${characterId}-cropped.png`;
		const keysToDelete = new Set<string>([originalKey, croppedKey]);
		if (charRow.imageKey) keysToDelete.add(charRow.imageKey);
		if (charRow.croppedKey) keysToDelete.add(charRow.croppedKey);

		for (const key of keysToDelete) {
			try {
				await deleteFile(key);
			} catch (error) {
				console.error(`Failed to delete character image ${key}:`, error);
			}
		}

		await db
			.update(character)
			.set({ referenceImageKey: null, croppedImageKey: null })
			.where(eq(character.id, characterId));

		return Response.json({ success: true });
	} catch (error) {
		console.error("Character image deletion failed:", error);
		return Response.json({ error: "Image deletion failed" }, { status: 500 });
	}
}
