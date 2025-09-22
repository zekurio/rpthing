import { characterRouter } from "@/server/routers/character";
import { realmRouter } from "@/server/routers/realm";
import { traitRouter } from "@/server/routers/trait";
import { protectedProcedure, publicProcedure, router } from "@/server/trpc";

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
