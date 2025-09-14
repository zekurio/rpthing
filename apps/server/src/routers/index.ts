import { protectedProcedure, publicProcedure, router } from "../lib/trpc.js";
import { realmRouter } from "./realm.js";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	realm: realmRouter,
});
export type AppRouter = typeof appRouter;
