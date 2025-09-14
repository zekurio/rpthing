import { z } from "zod";

//#region src/schemas/realm.ts
const idSchema = z.string().min(1);
const realmIdSchema = z.string().length(7);
const realmNameSchema = z.string().min(1).max(200);
const realmDescriptionSchema = z.string().max(2e3).nullish();
const realmPasswordSchema = z.string().min(1).max(32).nullish();
const realmCreateInputSchema = z.object({
	name: realmNameSchema,
	description: realmDescriptionSchema,
	password: realmPasswordSchema.nullish()
});
const realmMemberRoleSchema = z.enum([
	"owner",
	"admin",
	"member"
]);
const realmMemberCreateInputSchema = z.object({
	realmId: realmIdSchema,
	userId: idSchema,
	role: realmMemberRoleSchema
});
const realmTransferOwnershipInputSchema = z.object({
	realmId: realmIdSchema,
	newOwnerUserId: idSchema
});
const realmJoinInputSchema = z.object({
	realmId: realmIdSchema,
	password: realmPasswordSchema.nullish()
});
const realmUpdateInputSchema = z.object({
	id: realmIdSchema,
	name: realmNameSchema.optional(),
	description: realmDescriptionSchema.optional(),
	password: realmPasswordSchema.nullish()
});

//#endregion
export { idSchema, realmCreateInputSchema, realmDescriptionSchema, realmIdSchema, realmJoinInputSchema, realmMemberCreateInputSchema, realmMemberRoleSchema, realmNameSchema, realmPasswordSchema, realmTransferOwnershipInputSchema, realmUpdateInputSchema };