import { drizzle } from "drizzle-orm/bun-sql";
import { env } from "@/env";

const db = drizzle(env.DATABASE_URL);

export { db };
