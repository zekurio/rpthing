import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { env } from "@/env";

const db = drizzle(env.DATABASE_URL);

// Run migrations
await migrate(db, { migrationsFolder: "./drizzle/migrations" });

export { db };
