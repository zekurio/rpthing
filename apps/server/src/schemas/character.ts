import { z } from "zod";
import { idSchema, realmIdSchema } from "./rp";

export const characterIdSchema = idSchema;
export const characterNameSchema = z.string().min(1).max(200);
export const characterGenderSchema = z.string().max(50).nullish();
export const characterReferenceImageKeySchema = z.string().max(500).nullish();
export const characterNotesSchema = z.string().max(10000).nullish();

export const characterCreateInputSchema = z.object({
	realmId: realmIdSchema,
	name: characterNameSchema,
	gender: characterGenderSchema.optional(),
	isPublic: z.boolean().optional(),
	referenceImageKey: characterReferenceImageKeySchema.optional(),
	notes: characterNotesSchema.optional(),
});
export type CharacterCreateInput = z.infer<typeof characterCreateInputSchema>;

export const characterUpdateInputSchema = z.object({
	id: characterIdSchema,
	name: characterNameSchema.optional(),
	gender: characterGenderSchema.optional(),
	isPublic: z.boolean().optional(),
	referenceImageKey: characterReferenceImageKeySchema.optional(),
	notes: characterNotesSchema.optional(),
});
export type CharacterUpdateInput = z.infer<typeof characterUpdateInputSchema>;

export const characterListInputSchema = z.object({
	realmId: realmIdSchema,
});
export type CharacterListInput = z.infer<typeof characterListInputSchema>;

export const characterIdOnlySchema = z.object({ id: characterIdSchema });
