import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db/index";
import { realm } from "@/server/db/schema/realm";
import {
	cropImage,
	determineExtension,
	isSupportedImageType,
	parseCropJson,
	unsupportedImageResponse,
} from "@/server/image-processing";
import { deleteFile, getPublicFileUrl, uploadFile } from "@/server/storage";

type RealmParams = { realmId: string };

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<RealmParams> },
) {
	try {
		const { realmId } = await params;
		const formData = await req.formData();
		const file = formData.get("file");
		const cropJson = formData.get("crop");

		if (!(file instanceof File)) {
			return Response.json({ error: "No file provided" }, { status: 400 });
		}

		const session = await auth.api.getSession({ headers: req.headers });
		if (!session?.user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const [r] = await db
			.select({ ownerId: realm.ownerId, iconKey: realm.iconKey })
			.from(realm)
			.where(eq(realm.id, realmId))
			.limit(1);

		if (!r) {
			return Response.json({ error: "Realm not found" }, { status: 404 });
		}

		if (r.ownerId !== session.user.id) {
			return Response.json({ error: "Forbidden" }, { status: 403 });
		}

		const originalBuffer = new Uint8Array(await file.arrayBuffer());
		const mime = file.type || "";
		const filename = (file as unknown as { name?: string }).name || "";

		if (!isSupportedImageType(mime)) {
			return unsupportedImageResponse();
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
		return Response.json({ success: true, iconKey, url });
	} catch (error) {
		console.error("Realm icon upload failed:", error);
		return Response.json({ error: "File upload failed" }, { status: 500 });
	}
}

export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<RealmParams> },
) {
	try {
		const { realmId } = await params;
		const session = await auth.api.getSession({ headers: req.headers });

		if (!session?.user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const [r] = await db
			.select({ ownerId: realm.ownerId, iconKey: realm.iconKey })
			.from(realm)
			.where(eq(realm.id, realmId))
			.limit(1);

		if (!r) {
			return Response.json({ error: "Realm not found" }, { status: 404 });
		}

		if (r.ownerId !== session.user.id) {
			return Response.json({ error: "Forbidden" }, { status: 403 });
		}

		if (!r.iconKey) {
			return Response.json(
				{ error: "Realm has no icon to delete" },
				{ status: 400 },
			);
		}

		try {
			await deleteFile(r.iconKey);
		} catch (error) {
			console.error(`Failed to delete icon file ${r.iconKey}:`, error);
		}

		await db.update(realm).set({ iconKey: null }).where(eq(realm.id, realmId));

		return Response.json({ success: true });
	} catch (error) {
		console.error("Realm icon deletion failed:", error);
		return Response.json({ error: "Icon deletion failed" }, { status: 500 });
	}
}
