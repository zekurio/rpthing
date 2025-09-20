import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index";
import { user as userTable } from "../db/schema/auth";
import { realmMember } from "../db/schema/realmMember";
import { trait } from "../db/schema/traits";
import { protectedProcedure, router } from "../lib/trpc";

// Helper function to check if user is a realm member (including owner)
async function isRealmMember(userId: string, realmId: string) {
	const result = await db
		.select({ id: realmMember.id })
		.from(realmMember)
		.where(
			and(eq(realmMember.realmId, realmId), eq(realmMember.userId, userId)),
		)
		.limit(1);
	const member = result[0];
	return !!member;
}

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

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, realmId);
			if (!isMember) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a realm member",
				});
			}

			const result = await db
				.insert(trait)
				.values({
					realmId,
					createdByUserId: userId,
					name,
					description: description ?? null,
					displayMode: displayMode ?? undefined,
				})
				.returning();
			const created = result[0];

			return created;
		}),

	getById: protectedProcedure
		.input(z.object({ id: traitIdSchema }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { id } = input;

			const result = await db
				.select({
					id: trait.id,
					name: trait.name,
					description: trait.description,
					displayMode: trait.displayMode,
					realmId: trait.realmId,
					createdByUserId: trait.createdByUserId,
					createdByName: userTable.name,
					createdAt: trait.createdAt,
					updatedAt: trait.updatedAt,
				})
				.from(trait)
				.leftJoin(userTable, eq(userTable.id, trait.createdByUserId))
				.where(eq(trait.id, id))
				.limit(1);
			const t = result[0];

			if (!t) {
				// Return null instead of throwing error
				return null;
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, t.realmId);
			if (!isMember) {
				// Return null instead of throwing error
				return null;
			}

			return t;
		}),

	list: protectedProcedure
		.input(traitListInputSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId } = input;

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, realmId);
			if (!isMember) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a realm member",
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
					createdByUserId: trait.createdByUserId,
					createdByName: userTable.name,
				})
				.from(trait)
				.leftJoin(userTable, eq(userTable.id, trait.createdByUserId))
				.where(eq(trait.realmId, realmId));
		}),

	update: protectedProcedure
		.input(traitUpdateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { id, ...updates } = input;

			const result = await db
				.select({ id: trait.id, realmId: trait.realmId })
				.from(trait)
				.where(eq(trait.id, id))
				.limit(1);
			const t = result[0];

			if (!t) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Trait not found" });
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, t.realmId);
			if (!isMember) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a realm member",
				});
			}

			await db.update(trait).set(updates).where(eq(trait.id, id));

			return { success: true };
		}),

	delete: protectedProcedure
		.input(traitIdSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const result = await db
				.select({ id: trait.id, realmId: trait.realmId })
				.from(trait)
				.where(eq(trait.id, input))
				.limit(1);
			const t = result[0];

			if (!t) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Trait not found" });
			}

			// Check if user is a realm member (including owner)
			const isMember = await isRealmMember(userId, t.realmId);
			if (!isMember) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a realm member",
				});
			}

			await db.delete(trait).where(eq(trait.id, input));

			return true;
		}),
});
