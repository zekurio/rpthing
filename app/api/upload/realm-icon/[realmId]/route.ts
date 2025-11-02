import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db/index";
import { realm } from "@/server/db/schema/realm";
import { deleteFile, getPublicFileUrl, uploadFile } from "@/server/storage";

const unsupportedImageResponse = Response.json(
	{ error: "Only non-GIF image uploads are allowed" },
	{ status: 415 },
);

type RealmParams = { realmId: string };

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

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<RealmParams> },
) {
	try {
		const { realmId } = await params;
		const formData = await req.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			return Response.json({ error: "No file provided" }, { status: 400 });
		}

		const session = await auth.api.getSession({ headers: req.headers });
		if (!session?.user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const [r] = await db
			.select({ ownerId: realm.ownerId })
			.from(realm)
			.where(eq(realm.id, realmId))
			.limit(1);

		if (!r) {
			return Response.json({ error: "Realm not found" }, { status: 404 });
		}

		if (r.ownerId !== session.user.id) {
			return Response.json({ error: "Forbidden" }, { status: 403 });
		}

		const originalBuffer = await file.arrayBuffer();
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
		const ext = (extFromMime || nameExt || "bin").toLowerCase();

		const iconKey = `realm-icons/${realmId}.${ext}`;
		await uploadFile(iconKey, originalBuffer, {
			contentType: mime || undefined,
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
