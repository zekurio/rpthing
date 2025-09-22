import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "@/env";
import { db } from "@/server/db/index";
import * as schema from "@/server/db/schema/auth";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",

		schema: schema,
	}),
	socialProviders: {
		discord: {
			clientId: env.DISCORD_CLIENT_ID || "",
			clientSecret: env.DISCORD_CLIENT_SECRET || "",
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
