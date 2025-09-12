import { z } from "zod";

// Shared primitives
export const idSchema = z.string().min(1);

// Realm
export const realmIdSchema = idSchema;
export const realmNameSchema = z.string().min(1).max(200);
export const realmDescriptionSchema = z.string().max(2000).nullish();

export const realmCreateInputSchema = z.object({
	id: realmIdSchema,
	name: realmNameSchema,
	description: realmDescriptionSchema,
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

// Character
export const characterIdSchema = idSchema;

export const imageCropSchema = z.record(z.string(), z.unknown()).nullish();

export const characterCreateInputSchema = z.object({
	id: characterIdSchema,
	realmId: realmIdSchema,
	name: z.string().min(1).max(200),
	gender: z.string().max(50).nullish(),
	referenceImageKey: z.string().min(1).nullish(),
	imageCrop: imageCropSchema,
	notes: z.string().max(5000).nullish(),
});
export type CharacterCreateInput = z.infer<typeof characterCreateInputSchema>;
