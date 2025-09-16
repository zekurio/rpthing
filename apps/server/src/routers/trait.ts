import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { realm } from "../db/schema/realm";
import { trait } from "../db/schema/traits";
import { protectedProcedure, router } from "../lib/trpc";
import {
	traitCreateInputSchema,
	traitIdSchema,
	traitListInputSchema,
	traitUpdateInputSchema,
} from "../schemas/traits";

export const traitRouter = router({
	create: protectedProcedure
		.input(traitCreateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId, name, description, displayMode } = input;

			const [ownsRealm] = await db
				.select({ id: realm.id })
				.from(realm)
				.where(and(eq(realm.id, realmId), eq(realm.ownerId, userId)))
				.limit(1);

			if (!ownsRealm) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
				});
			}

			const [created] = await db
				.insert(trait)
				.values({
					realmId,
					name,
					description: description ?? null,
					displayMode: displayMode ?? undefined,
				})
				.returning();

			return created;
		}),

	getById: protectedProcedure
		.input(z.object({ id: traitIdSchema }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { id } = input;

			const [t] = await db
				.select({
					id: trait.id,
					name: trait.name,
					description: trait.description,
					displayMode: trait.displayMode,
					realmId: trait.realmId,
				})
				.from(trait)
				.where(eq(trait.id, id))
				.limit(1);

			if (!t) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Trait not found" });
			}

			const [ownsRealm] = await db
				.select({ id: realm.id })
				.from(realm)
				.where(and(eq(realm.id, t.realmId), eq(realm.ownerId, userId)))
				.limit(1);

			if (!ownsRealm) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
				});
			}

			return t;
		}),

	list: protectedProcedure
		.input(traitListInputSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId } = input;

			const [ownsRealm] = await db
				.select({ id: realm.id })
				.from(realm)
				.where(and(eq(realm.id, realmId), eq(realm.ownerId, userId)))
				.limit(1);

			if (!ownsRealm) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
				});
			}

			return await db
				.select({
					id: trait.id,
					name: trait.name,
					description: trait.description,
					displayMode: trait.displayMode,
					realmId: trait.realmId,
					createdAt: trait.createdAt,
					updatedAt: trait.updatedAt,
				})
				.from(trait)
				.where(eq(trait.realmId, realmId));
		}),

	update: protectedProcedure
		.input(traitUpdateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { id, ...updates } = input;

			const [t] = await db
				.select({ id: trait.id, realmId: trait.realmId })
				.from(trait)
				.where(eq(trait.id, id))
				.limit(1);

			if (!t) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Trait not found" });
			}

			const [ownsRealm] = await db
				.select({ id: realm.id })
				.from(realm)
				.where(and(eq(realm.id, t.realmId), eq(realm.ownerId, userId)))
				.limit(1);

			if (!ownsRealm) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
				});
			}

			await db.update(trait).set(updates).where(eq(trait.id, id));

			return { success: true };
		}),

	delete: protectedProcedure
		.input(traitIdSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [t] = await db
				.select({ id: trait.id, realmId: trait.realmId })
				.from(trait)
				.where(eq(trait.id, input))
				.limit(1);

			if (!t) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Trait not found" });
			}

			const [ownsRealm] = await db
				.select({ id: realm.id })
				.from(realm)
				.where(and(eq(realm.id, t.realmId), eq(realm.ownerId, userId)))
				.limit(1);

			if (!ownsRealm) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
				});
			}

			await db.delete(trait).where(eq(trait.id, input));

			return true;
		}),
});
