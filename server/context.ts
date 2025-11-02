import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { auth } from "@/server/auth";

export async function createContext({ req }: FetchCreateContextFnOptions) {
	const session = await auth.api.getSession({ headers: req.headers });
	return { session };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
