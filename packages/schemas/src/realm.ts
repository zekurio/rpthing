import { z } from "zod";

// Shared primitives
export const id = z.string().min(1);

// Realm
export const realmId = z.string().length(7);
export const realmName = z.string().min(1).max(200);
export const realmDescription = z.string().max(2000).nullish();
export const realmPassword = z.string().min(1).max(32).nullish();

export const createInput = z.object({
	name: realmName,
	description: realmDescription,
	password: realmPassword.nullish(),
});
export type CreateInput = z.infer<typeof createInput>;

export const memberRole = z.enum(["owner", "admin", "member"]);
export type MemberRole = z.infer<typeof memberRole>;

export const memberCreateInput = z.object({
	realmId: realmId,
	userId: id,
	role: memberRole,
});
export type MemberCreateInput = z.infer<typeof memberCreateInput>;

export const transferOwnershipInput = z.object({
	realmId: realmId,
	newOwnerUserId: id,
});
export type TransferOwnershipInput = z.infer<typeof transferOwnershipInput>;

export const joinInput = z.object({
	realmId: realmId,
	password: realmPassword.nullish(),
});
export type JoinInput = z.infer<typeof joinInput>;

export const updateInput = z.object({
	id: realmId,
	name: realmName.optional(),
	description: realmDescription.optional(),
	password: realmPassword.nullish(),
});
export type UpdateInput = z.infer<typeof updateInput>;

// Form-friendly variants used on the client
export const form = {
	create: z.object({
		name: z.string().min(1, "Name is required").max(50),
		description: z.string().max(500).optional(),
		password: z.string().min(4).max(100).optional(),
	}),
	join: z.object({
		realmId: z
			.string()
			.length(7, "Realm ID must be exactly 7 characters")
			.regex(/^[A-Za-z0-9]+$/, "Realm ID must contain only letters and numbers"),
		password: z.string().max(100).optional(),
	}),
	update: z.object({
		name: z.string().min(1, "Name is required").optional(),
		description: z.string().max(500).optional(),
		password: z.string().min(4).max(100).optional(),
	}),
};

// Legacy alias exports to ease migration
export const realmIdSchema = realmId;
export const realmNameSchema = realmName;
export const realmDescriptionSchema = realmDescription;
export const realmPasswordSchema = realmPassword;
export const realmCreateInputSchema = createInput;
export const realmMemberRoleSchema = memberRole;
export const realmMemberCreateInputSchema = memberCreateInput;
export const realmTransferOwnershipInputSchema = transferOwnershipInput;
export const realmJoinInputSchema = joinInput;
export const realmUpdateInputSchema = updateInput;

export type RealmCreateInput = CreateInput;
export type RealmMemberRole = MemberRole;
export type RealmMemberCreateInput = MemberCreateInput;
export type RealmTransferOwnershipInput = TransferOwnershipInput;
export type RealmJoinInput = JoinInput;
export type RealmUpdateInput = UpdateInput;

