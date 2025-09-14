import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import sharp from "sharp";
import { db } from "./db/index.js";
import { realm } from "./db/schema/rp.js";
import { auth } from "./lib/auth.js";
import { createContext } from "./lib/context.js";
import { deleteFile, getFileUrl, uploadFile } from "./lib/storage.js";
import { appRouter } from "./routers/index.js";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN || "",
		allowMethods: ["GET", "POST", "OPTIONS"],
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

		// Process image with Sharp
		const buffer = await file.arrayBuffer();
		const pngBuffer = await sharp(buffer).png().toBuffer();

		// Upload file
		const iconKey = `realm-icons/${realmId}.png`;
		await uploadFile(iconKey, pngBuffer);

		// Update database
		await db.update(realm).set({ iconKey }).where(eq(realm.id, realmId));

		// Return URL
		const url = await getFileUrl(iconKey);
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

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
