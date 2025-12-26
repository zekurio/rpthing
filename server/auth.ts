import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "@/env";
import { db } from "@/server/db/index";
import * as schema from "@/server/db/schema/auth";

export const auth = betterAuth({
	// basePath is relative to where the handler is mounted in Elysia
	// Mounted at /auth in Elysia with prefix /api → /api/auth/*
	basePath: "",
	database: drizzleAdapter(db, {
		provider: "pg",

		schema: schema,
	}),
	socialProviders: {
		discord: {
			clientId: env.DISCORD_CLIENT_ID || "",
			clientSecret: env.DISCORD_CLIENT_SECRET || "",
			redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/discord`,
		},
	},
	user: {
		deleteUser: {
			enabled: true,
		},
	},
	advanced: {
		database: {
			generateId: () => Bun.randomUUIDv7(),
		},
	},
});
