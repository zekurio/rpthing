import "dotenv/config";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { trpcServer } from "@hono/trpc-server";
import { migrate } from "drizzle-orm/libsql/migrator";
import { Hono } from "hono";
import { serve } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { createContext } from "@/lib/context";
import { appRouter } from "@/routers/index";

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

app.get("/", (c) => {
	return c.text("OK");
});

async function runMigrationsOnStartup() {
	const migrationsFolder =
		process.env.DRIZZLE_MIGRATIONS_FOLDER || "./src/db/migrations";
	if (!existsSync(migrationsFolder)) {
		await mkdir(migrationsFolder, { recursive: true });
	}
	await migrate(db, { migrationsFolder });
}

await runMigrationsOnStartup();

export default app;
