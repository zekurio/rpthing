import { z } from "zod";

// Shared primitives
export const idSchema = z.string().min(1);

// Realm
export const realmIdSchema = idSchema;
export const realmNameSchema = z.string().min(1).max(200);
export const realmDescriptionSchema = z.string().max(2000).nullish();
export const realmPasswordSchema = z.string().min(1).max(32).nullish();

export const realmCreateInputSchema = z.object({
	name: realmNameSchema,
	description: realmDescriptionSchema,
	password: realmPasswordSchema.nullish(),
});
export type RealmCreateInput = z.infer<typeof realmCreateInputSchema>;

// Realm Member
export const realmMemberRoleSchema = z.enum(["owner", "admin", "member"]);
export type RealmMemberRole = z.infer<typeof realmMemberRoleSchema>;

export const realmMemberCreateInputSchema = z.object({
	realmId: realmIdSchema,
	userId: idSchema,
	role: realmMemberRoleSchema,
});
export type RealmMemberCreateInput = z.infer<
	typeof realmMemberCreateInputSchema
>;

// Transfer ownership
export const realmTransferOwnershipInputSchema = z.object({
	realmId: realmIdSchema,
	newOwnerUserId: idSchema,
});
export type RealmTransferOwnershipInput = z.infer<
	typeof realmTransferOwnershipInputSchema
>;

// Join realm
export const realmJoinInputSchema = z.object({
	realmId: realmIdSchema,
	password: realmPasswordSchema.nullish(),
});
export type RealmJoinInput = z.infer<typeof realmJoinInputSchema>;

export const realmUpdateInputSchema = z.object({
	id: realmIdSchema,
	name: realmNameSchema.optional(),
	description: realmDescriptionSchema.optional(),
	password: realmPasswordSchema.nullish(),
});
export type RealmUpdateInput = z.infer<typeof realmUpdateInputSchema>;
