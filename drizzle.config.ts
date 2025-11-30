import { defineConfig } from "drizzle-kit";
import { env } from "./env";

export default defineConfig({
	schema: "./server/db/schema",
	out: "./drizzle/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL || "",
	},
});
