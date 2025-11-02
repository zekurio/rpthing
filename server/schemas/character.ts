import { z } from "zod";
import { dateTimeSchema, idSchema, realmIdSchema } from "./rp";
import { characterTraitRatingSchema } from "./traits";

export const characterIdSchema = idSchema;
export const characterNameSchema = z.string().min(1).max(200);
export const characterGenderSchema = z.string().max(50).nullish();
export const characterReferenceImageKeySchema = z.string().max(500).nullish();
export const characterNotesSchema = z.string().max(10000).nullish();

export const characterCreateInputSchema = z.object({
	realmId: realmIdSchema,
	name: characterNameSchema,
	gender: characterGenderSchema.optional(),
	referenceImageKey: characterReferenceImageKeySchema.optional(),
	notes: characterNotesSchema.optional(),
});
export type CharacterCreateInput = z.infer<typeof characterCreateInputSchema>;

export const characterUpdateInputSchema = z.object({
	id: characterIdSchema,
	name: characterNameSchema.optional(),
	gender: characterGenderSchema.optional(),
	referenceImageKey: characterReferenceImageKeySchema.optional(),
	notes: characterNotesSchema.optional(),
});
export type CharacterUpdateInput = z.infer<typeof characterUpdateInputSchema>;

export const characterListInputSchema = z.object({
	realmId: realmIdSchema,
});
export type CharacterListInput = z.infer<typeof characterListInputSchema>;

export const characterIdOnlySchema = z.object({ id: characterIdSchema });

const nullableString = z.string().nullable();

export const characterDataSchema = z.object({
	id: characterIdSchema,
	realmId: realmIdSchema,
	name: characterNameSchema,
	gender: nullableString,
	referenceImageKey: nullableString,
	croppedImageKey: nullableString,
	notes: nullableString,
	userId: idSchema,
	userName: nullableString.optional(),
	createdAt: dateTimeSchema,
	updatedAt: dateTimeSchema,
});
export type CharacterData = z.infer<typeof characterDataSchema>;

export const characterListItemSchema = characterDataSchema
	.extend({
		ratingsSummary: z.array(characterTraitRatingSchema).optional(),
	})
	.partial({
		userId: true,
		userName: true,
		createdAt: true,
		updatedAt: true,
		croppedImageKey: true,
	});
export type CharacterListItem = z.infer<typeof characterListItemSchema>;

export const characterWithRatingsSchema = z.object({
	id: characterIdSchema,
	realmId: realmIdSchema,
	name: characterNameSchema,
	traits: z.array(characterTraitRatingSchema),
});
export type CharacterWithRatings = z.infer<typeof characterWithRatingsSchema>;
