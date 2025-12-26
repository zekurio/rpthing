import { Elysia } from "elysia";
import { auth } from "./auth";
import { characterRoutes } from "./routes/character";
import { ratingRoutes } from "./routes/rating";
import { realmRoutes } from "./routes/realm";
import { traitRoutes } from "./routes/trait";
import { uploadRoutes } from "./routes/upload";

/**
 * Auth plugin that mounts Better Auth and provides auth macro for protected routes
 */
const authPlugin = new Elysia({ name: "auth" })
	.mount("/auth", auth.handler)
	.macro({
		isAuthenticated: {
			async resolve({ status, request: { headers } }) {
				const session = await auth.api.getSession({ headers });

				if (!session) {
					return status(401, { error: "Unauthorized" });
				}

				return {
					user: session.user,
					session: session.session,
				};
			},
		},
	});

/**
 * Main Elysia app instance
 *
 * Routes:
 * - /auth/api/* - Better Auth (mounted with basePath: '/api')
 * - /api/* - All API routes
 */
export const app = new Elysia({ prefix: "/api" })
	.use(authPlugin)
	.get("/health", () => "OK")
	.use(realmRoutes)
	.use(traitRoutes)
	.use(characterRoutes)
	.use(ratingRoutes)
	.use(uploadRoutes);

export type App = typeof app;
