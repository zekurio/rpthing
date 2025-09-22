import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { Context as HonoContext } from "hono";
import { auth } from "@/server/auth";

export type CreateContextOptions = {
	context: HonoContext | FetchCreateContextFnOptions;
};

export async function createContext({ context }: CreateContextOptions) {
	let headers: Headers;
	// Hono Context: has req.raw (Web Request)
	if (
		typeof (context as HonoContext).req === "object" &&
		(context as HonoContext).req?.raw instanceof Request
	) {
		headers = (context as HonoContext).req.raw.headers;
	} else if (
		typeof (context as FetchCreateContextFnOptions).req === "object" &&
		(context as FetchCreateContextFnOptions).req instanceof Request
	) {
		// tRPC fetch adapter options
		headers = (context as FetchCreateContextFnOptions).req.headers;
	} else {
		// Fallback to empty headers
		headers = new Headers();
	}

	const session = await auth.api.getSession({ headers });
	return { session };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
