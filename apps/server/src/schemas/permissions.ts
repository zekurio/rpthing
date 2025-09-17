import { z } from "zod";
import { idSchema } from "./rp";

export const characterPermissionScopeSchema = z.enum([
	"profile",
	"image",
	"ratings",
]);

export const characterPermissionListInputSchema = z.object({
	characterId: idSchema,
});

export const characterPermissionUpsertInputSchema = z.object({
	characterId: idSchema,
	granteeUserId: idSchema,
	scope: characterPermissionScopeSchema,
});

export const characterPermissionDeleteInputSchema = z.object({
	characterId: idSchema,
	granteeUserId: idSchema,
	scope: characterPermissionScopeSchema,
});

export type CharacterPermissionScope = z.infer<
	typeof characterPermissionScopeSchema
>;
