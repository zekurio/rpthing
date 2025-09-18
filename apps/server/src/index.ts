import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import sharp from "sharp";
import { db } from "./db/index";
import { character } from "./db/schema/character";
import { realm } from "./db/schema/realm";
import { realmMember } from "./db/schema/realmMember";
import { auth } from "./lib/auth";
import { createContext } from "./lib/context";
import { deleteFile, existsFile, getFileUrl, getPublicFileUrl, uploadFile } from "./lib/storage";
import { appRouter } from "./routers/index";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN || "",
		allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.post("/api/upload/realm-icon/:realmId", async (c) => {
	try {
		const realmId = c.req.param("realmId");
		const formData = await c.req.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return c.json({ error: "No file provided" }, 400);
		}

		// Authenticate user
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		});

		if (!session?.user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// Verify realm exists and user has permission
		const [r] = await db
			.select({ ownerId: realm.ownerId })
			.from(realm)
			.where(eq(realm.id, realmId))
			.limit(1);

		if (!r) {
			return c.json({ error: "Realm not found" }, 404);
		}

		if (r.ownerId !== session.user.id) {
			return c.json({ error: "Forbidden" }, 403);
		}

		// Derive extension without converting the image
		const originalBuffer = await file.arrayBuffer();
		const mime = file.type || "";
		const nameExt = (() => {
			const name = (file as unknown as { name?: string }).name || "";
			const idx = name.lastIndexOf(".");
			return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
		})();
		const extFromMime = (() => {
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
		})();
		const ext = (extFromMime || nameExt || "bin").toLowerCase();

		// Upload file in its original format
		const iconKey = `realm-icons/${realmId}.${ext}`;
		const iconContentType = mime || (() => {
			switch (ext) {
				case "png":
					return "image/png";
				case "jpg":
				case "jpeg":
					return "image/jpeg";
				case "webp":
					return "image/webp";
				case "avif":
					return "image/avif";
				case "gif":
					return "image/gif";
				default:
					return "application/octet-stream";
			}
		})();
		await uploadFile(iconKey, originalBuffer, iconContentType);

		// Update database
		await db.update(realm).set({ iconKey }).where(eq(realm.id, realmId));

    // Return public CDN URL for immediate access
    const url = getPublicFileUrl(iconKey);
		return c.json({ success: true, iconKey, url });
	} catch (error) {
		console.error("File upload failed:", error);
		return c.json({ error: "File upload failed" }, 500);
	}
});

app.delete("/api/upload/realm-icon/:realmId", async (c) => {
	try {
		const realmId = c.req.param("realmId");

		// Authenticate user
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		});

		if (!session?.user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// Verify realm exists and user has permission
		const [r] = await db
			.select({ ownerId: realm.ownerId, iconKey: realm.iconKey })
			.from(realm)
			.where(eq(realm.id, realmId))
			.limit(1);

		if (!r) {
			return c.json({ error: "Realm not found" }, 404);
		}

		if (r.ownerId !== session.user.id) {
			return c.json({ error: "Forbidden" }, 403);
		}

		if (!r.iconKey) {
			return c.json({ error: "Realm has no icon to delete" }, 400);
		}

		// Delete the file from storage
		try {
			await deleteFile(r.iconKey);
		} catch (error) {
			console.error(`Failed to delete icon file ${r.iconKey}:`, error);
			// Continue with database update even if file deletion fails
		}

		// Remove icon from database
		await db.update(realm).set({ iconKey: null }).where(eq(realm.id, realmId));

		return c.json({ success: true });
	} catch (error) {
		console.error("Icon deletion failed:", error);
		return c.json({ error: "Icon deletion failed" }, 500);
	}
});

// Upload character reference image without format conversion
// Store original image as-is and optional crop in the same format
app.post("/api/upload/character-image/:characterId", async (c) => {
	try {
		const characterId = c.req.param("characterId");
		const formData = await c.req.formData();
		const file = (formData.get("file") as File) ?? null;
		const cropJson = formData.get("crop") as string | null;

		if (!file && !cropJson) {
			return c.json({ error: "No file or crop provided" }, 400);
		}

		// Authenticate user
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		});
		if (!session?.user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// Verify character exists and permissions
		const [charRow] = await db
			.select({ realmId: character.realmId, ownerId: character.userId })
			.from(character)
			.where(eq(character.id, characterId))
			.limit(1);
		if (!charRow) {
			return c.json({ error: "Character not found" }, 404);
		}
		const [r] = await db
			.select({ ownerId: realm.ownerId })
			.from(realm)
			.where(eq(realm.id, charRow.realmId))
			.limit(1);
		const isRealmOwner = !!r && r.ownerId === session.user.id;
		const isCharacterOwner = charRow.ownerId === session.user.id;
		if (!isRealmOwner && !isCharacterOwner) {
			// Public character can be edited by realm members
			const [char] = await db
				.select({ isPublic: character.isPublic, realmId: character.realmId })
				.from(character)
				.where(eq(character.id, characterId))
				.limit(1);
			if (!char?.isPublic) return c.json({ error: "Forbidden" }, 403);
			const [member] = await db
				.select({ id: realmMember.id })
				.from(realmMember)
				.where(
					and(
						eq(realmMember.realmId, char.realmId),
						eq(realmMember.userId, session.user.id),
					),
				)
				.limit(1);
			if (!member) return c.json({ error: "Forbidden" }, 403);
		}

		// We will derive the extension from the uploaded file (or previously stored key)
		let originalExt: string | null = null;

		// Prepare base (original) image buffer
		let baseBuffer: Uint8Array | null = null;
		if (file) {
			const buffer = await file.arrayBuffer();
			baseBuffer = new Uint8Array(buffer);
			const mime = file.type || "";
			const name = (file as unknown as { name?: string }).name || "";
			const nameExt = (() => {
				const idx = name.lastIndexOf(".");
				return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
			})();
			const extFromMime = (() => {
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
			})();
			originalExt = (extFromMime || nameExt || "bin").toLowerCase();

			const originalKey = `character-images/${characterId}.${originalExt}`;
			// Upload original as-is
			const originalContentType = mime || (() => {
				switch (originalExt) {
					case "png":
						return "image/png";
					case "jpg":
					case "jpeg":
						return "image/jpeg";
					case "webp":
						return "image/webp";
					case "avif":
						return "image/avif";
					case "gif":
						return "image/gif";
					default:
						return "application/octet-stream";
				}
			})();
			await uploadFile(originalKey, baseBuffer, originalContentType);
		} else {
			// No file provided, ensure original exists and fetch it
			// Try known common extensions to locate the existing original
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
				return c.json({ error: "Original image not found" }, 400);
			}
			const presigned = await getFileUrl(foundKey, { expiresIn: 60 });
			const resp = await fetch(presigned);
			if (!resp.ok) return c.json({ error: "Failed to fetch original" }, 502);
			const buf = await resp.arrayBuffer();
			baseBuffer = new Uint8Array(buf);
		}

		// Optionally create cropped variant
		let croppedKey: string | null = null;
		if (cropJson) {
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
						// Write in the same format as original (no conversion)
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
								// sharp cannot output GIF; fall back to PNG to preserve transparency
								croppedBuf = await pipeline.png().toBuffer();
								originalExt = "png";
								break;
							default:
								croppedBuf = await pipeline.png().toBuffer();
								originalExt = "png";
						}
						croppedKey = `character-images/${characterId}-cropped.${originalExt}`;
						const croppedContentType = (() => {
							switch ((originalExt || "").toLowerCase()) {
								case "png":
									return "image/png";
								case "jpg":
								case "jpeg":
									return "image/jpeg";
								case "webp":
									return "image/webp";
								case "avif":
									return "image/avif";
								case "gif":
									return "image/gif";
								default:
									return "application/octet-stream";
							}
						})();
						await uploadFile(croppedKey, croppedBuf, croppedContentType);
					}
				}
			} catch {}
		}

		// Update database keys
		// Compute original key from ext
		const finalOriginalKey = `character-images/${characterId}.${originalExt ?? "bin"}`;
		await db
			.update(character)
			.set({ referenceImageKey: finalOriginalKey, croppedImageKey: croppedKey })
			.where(eq(character.id, characterId));

        const url = getPublicFileUrl(croppedKey ?? finalOriginalKey);
		return c.json({
			success: true,
			imageKey: finalOriginalKey,
			croppedKey,
			url,
		});
	} catch (error) {
		console.error("Character image upload failed:", error);
		return c.json({ error: "File upload failed" }, 500);
	}
});

// Delete character reference image
app.delete("/api/upload/character-image/:characterId", async (c) => {
	try {
		const characterId = c.req.param("characterId");

		// Authenticate user
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		});
		if (!session?.user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// Verify character exists and permissions
		const [charRow] = await db
			.select({
				realmId: character.realmId,
				ownerId: character.userId,
				imageKey: character.referenceImageKey,
				croppedKey: character.croppedImageKey,
			})
			.from(character)
			.where(eq(character.id, characterId))
			.limit(1);
		if (!charRow) {
			return c.json({ error: "Character not found" }, 404);
		}
		const [r] = await db
			.select({ ownerId: realm.ownerId })
			.from(realm)
			.where(eq(realm.id, charRow.realmId))
			.limit(1);
		const isRealmOwner = !!r && r.ownerId === session.user.id;
		const isCharacterOwner = charRow.ownerId === session.user.id;
		if (!isRealmOwner && !isCharacterOwner) {
			const [char] = await db
				.select({ isPublic: character.isPublic, realmId: character.realmId })
				.from(character)
				.where(eq(character.id, characterId))
				.limit(1);
			if (!char?.isPublic) return c.json({ error: "Forbidden" }, 403);
			const [member] = await db
				.select({ id: realmMember.id })
				.from(realmMember)
				.where(
					and(
						eq(realmMember.realmId, char.realmId),
						eq(realmMember.userId, session.user.id),
					),
				)
				.limit(1);
			if (!member) return c.json({ error: "Forbidden" }, 403);
		}

		if (!charRow.imageKey) {
			return c.json({ error: "Character has no image to delete" }, 400);
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

		return c.json({ success: true });
	} catch (error) {
		console.error("Character image deletion failed:", error);
		return c.json({ error: "Image deletion failed" }, 500);
	}
});

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
