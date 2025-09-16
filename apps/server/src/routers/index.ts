import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { characterRouter } from "./character";
import { realmRouter } from "./realm";
import { traitRouter } from "./trait";

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
	trait: traitRouter,
	character: characterRouter,
});
export type AppRouter = typeof appRouter;
