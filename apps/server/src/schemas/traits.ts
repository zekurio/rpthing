import { z } from "zod";
import { idSchema, realmIdSchema } from "./rp";

export const TRAIT_GRADES = [
	"F",
	"E-",
	"E",
	"E+",
	"D-",
	"D",
	"D+",
	"C-",
	"C",
	"C+",
	"B-",
	"B",
	"B+",
	"A-",
	"A",
	"A+",
	"S-",
	"S",
	"S+",
	"Z",
] as const;

export const traitIdSchema = idSchema;
export const traitNameSchema = z.string().min(1).max(100);
export const traitDescriptionSchema = z.string().max(2000).nullish();
export const traitDisplayModeSchema = z.enum(["number", "grade"]);

export const traitCreateInputSchema = z.object({
	realmId: realmIdSchema,
	name: traitNameSchema,
	description: traitDescriptionSchema.optional(),
	displayMode: traitDisplayModeSchema.optional(),
});
export type TraitCreateInput = z.infer<typeof traitCreateInputSchema>;

export const traitUpdateInputSchema = z.object({
	id: traitIdSchema,
	name: traitNameSchema.optional(),
	description: traitDescriptionSchema.optional(),
	displayMode: traitDisplayModeSchema.optional(),
});
export type TraitUpdateInput = z.infer<typeof traitUpdateInputSchema>;

export const traitListInputSchema = z.object({
	realmId: realmIdSchema,
});
export type TraitListInput = z.infer<typeof traitListInputSchema>;

export const ratingValueSchema = z.union([
	z.number().int().min(1).max(20),
	z.enum(TRAIT_GRADES),
]);

export const ratingCreateOrUpdateInputSchema = z.object({
	characterId: idSchema,
	traitId: idSchema,
	value: ratingValueSchema,
});
export type RatingCreateOrUpdateInput = z.infer<
	typeof ratingCreateOrUpdateInputSchema
>;

export const ratingIdSchema = idSchema;

export const ratingListByCharacterInputSchema = z.object({
	characterId: idSchema,
});
export type RatingListByCharacterInput = z.infer<
	typeof ratingListByCharacterInputSchema
>;

export const ratingGetByPairInputSchema = z.object({
	characterId: idSchema,
	traitId: idSchema,
});
export type RatingGetByPairInput = z.infer<typeof ratingGetByPairInputSchema>;
