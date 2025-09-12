import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { realm, realmMember } from "../db/schema/rp";
import { protectedProcedure, router } from "../lib/trpc";
import {
	realmCreateInputSchema,
	realmIdSchema,
	realmJoinInputSchema,
	realmTransferOwnershipInputSchema,
} from "../schemas";

export const realmRouter = router({
	create: protectedProcedure
		.input(realmCreateInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			await db.transaction(async (tx) => {
				await tx.insert(realm).values({
					id: input.id,
					name: input.name,
					description: input.description ?? null,
					password: input.password
						? await Bun.password.hash(input.password)
						: null,
					ownerId: userId,
				});

				await tx.insert(realmMember).values({
					realmId: input.id,
					userId,
					role: "owner",
				});
			});

			const [created] = await db
				.select()
				.from(realm)
				.where(eq(realm.id, input.id))
				.limit(1);

			return created;
		}),

	list: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const rows = await db
			.select({
				id: realm.id,
				name: realm.name,
				description: realm.description,
				ownerId: realm.ownerId,
				createdAt: realm.createdAt,
				updatedAt: realm.updatedAt,
				role: realmMember.role,
			})
			.from(realmMember)
			.innerJoin(realm, eq(realm.id, realmMember.realmId))
			.where(eq(realmMember.userId, userId));

		return rows;
	}),

	join: protectedProcedure
		.input(realmJoinInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId, password } = input;

			// Check if realm exists
			const [r] = await db
				.select({ id: realm.id, password: realm.password })
				.from(realm)
				.where(eq(realm.id, realmId))
				.limit(1);

			if (!r) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Realm not found" });
			}

			// If realm has a password, verify it
			if (r.password) {
				const ok = password
					? await Bun.password.verify(password, r.password)
					: false;
				if (!ok) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "Invalid password",
					});
				}
			}

			// If already a member, succeed idempotently
			const existing = await db
				.select({ userId: realmMember.userId })
				.from(realmMember)
				.where(
					and(eq(realmMember.realmId, realmId), eq(realmMember.userId, userId)),
				)
				.limit(1);
			if (existing.length > 0) {
				return true;
			}

			await db.insert(realmMember).values({ realmId, userId, role: "member" });
			return true;
		}),

	leave: protectedProcedure
		.input(realmIdSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [r] = await db
				.select({ ownerId: realm.ownerId })
				.from(realm)
				.where(eq(realm.id, input))
				.limit(1);

			if (!r) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Realm not found" });
			}

			if (r.ownerId === userId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Owners cannot leave their own realm. Delete it instead.",
				});
			}

			const result = await db
				.delete(realmMember)
				.where(
					and(eq(realmMember.realmId, input), eq(realmMember.userId, userId)),
				);

			if ((result as unknown as { rowsAffected?: number }).rowsAffected === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Membership not found",
				});
			}

			return true;
		}),

	delete: protectedProcedure
		.input(realmIdSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const [r] = await db
				.select({ ownerId: realm.ownerId })
				.from(realm)
				.where(eq(realm.id, input))
				.limit(1);

			if (!r) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Realm not found" });
			}

			if (r.ownerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not the realm owner",
				});
			}

			await db.delete(realm).where(eq(realm.id, input));

			return true;
		}),

	transferOwnership: protectedProcedure
		.input(realmTransferOwnershipInputSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const { realmId, newOwnerUserId } = input;

			if (userId === newOwnerUserId) {
				return true;
			}

			await db.transaction(async (tx) => {
				const [r] = await tx
					.select({ ownerId: realm.ownerId })
					.from(realm)
					.where(eq(realm.id, realmId))
					.limit(1);

				if (!r) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Realm not found",
					});
				}

				if (r.ownerId !== userId) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Not the realm owner",
					});
				}

				const [targetMembership] = await tx
					.select({ userId: realmMember.userId, role: realmMember.role })
					.from(realmMember)
					.where(
						and(
							eq(realmMember.realmId, realmId),
							eq(realmMember.userId, newOwnerUserId),
						),
					)
					.limit(1);

				if (!targetMembership) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "New owner must be a member of the realm",
					});
				}

				// Demote current owner to admin, promote new owner
				await tx
					.update(realm)
					.set({ ownerId: newOwnerUserId })
					.where(eq(realm.id, realmId));

				await tx
					.update(realmMember)
					.set({ role: "admin" })
					.where(
						and(
							eq(realmMember.realmId, realmId),
							eq(realmMember.userId, userId),
						),
					);

				await tx
					.update(realmMember)
					.set({ role: "owner" })
					.where(
						and(
							eq(realmMember.realmId, realmId),
							eq(realmMember.userId, newOwnerUserId),
						),
					);
			});

			return true;
		}),
});
