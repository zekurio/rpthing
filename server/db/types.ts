import type { InferSelectModel } from "drizzle-orm";
import { z } from "zod";
import type { account, session, user, verification } from "./schema/auth";
import type { character } from "./schema/character";
import type { realm } from "./schema/realm";
import type { realmMember } from "./schema/realmMember";
import type { characterTraitRating, trait } from "./schema/traits";

// Base types derived directly from Drizzle schemas
export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
export type Account = InferSelectModel<typeof account>;
export type Verification = InferSelectModel<typeof verification>;
export type Character = InferSelectModel<typeof character>;
export type Realm = InferSelectModel<typeof realm>;
export type RealmMember = InferSelectModel<typeof realmMember>;
export type Trait = InferSelectModel<typeof trait>;
export type CharacterTraitRating = InferSelectModel<
	typeof characterTraitRating
>;

// Transformed types that match router output structures

// Character with image URLs (transformed from image keys)
export interface CharacterWithImageUrls
	extends Omit<Character, "referenceImageKey" | "croppedImageKey"> {
	referenceImageKey: string | null;
	croppedImageKey: string | null;
}

// Character list item with user info and ratings summary
export interface CharacterListItem
	extends Omit<
		Character,
		| "referenceImageKey"
		| "croppedImageKey"
		| "userId"
		| "createdAt"
		| "updatedAt"
	> {
	referenceImageKey: string | null;
	croppedImageKey: string | null;
	userId?: string;
	userName?: string | null;
	createdAt: string;
	updatedAt: string;
	ratingsSummary?: Array<{
		traitId: string;
		traitName: string;
		description: string | null;
		displayMode: "number" | "grade";
		ratingId: string | null;
		value: number | null;
	}>;
}

// Character with full ratings
export interface CharacterWithRatings {
	id: string;
	realmId: string;
	name: string;
	traits: Array<{
		traitId: string;
		traitName: string;
		description: string | null;
		displayMode: "number" | "grade";
		ratingId: string | null;
		value: number | null;
	}>;
}

// Realm with icon URL (transformed from icon key)
export interface RealmWithIconUrl extends Omit<Realm, "iconKey" | "password"> {
	iconKey: string | null;
	hasPassword: boolean;
}

// Realm list item with member count
export interface RealmListItem
	extends Omit<Realm, "iconKey" | "password" | "ownerId"> {
	iconKey: string | null;
	memberCount: number;
	ownerId?: string;
}

// Realm member with role information
export interface RealmMemberWithRole extends Omit<RealmMember, "userId"> {
	userId: string;
	name: string;
	email: string;
	image: string | null;
	joinedAt: Date;
	role: "owner" | "member";
}

// Trait with creator information
export interface TraitWithCreator extends Omit<Trait, "createdByUserId"> {
	createdByUserId?: string | null;
	createdByName?: string | null;
}

// Rating with trait information (for character ratings)
export interface CharacterTraitRatingWithTrait {
	traitId: string;
	traitName: string;
	description: string | null;
	displayMode: "number" | "grade";
	ratingId: string | null;
	value: number | null;
}

// Rating value can be either numeric (1-20) or grade string
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

export type TraitGrade = (typeof TRAIT_GRADES)[number];
export type RatingValue = number | TraitGrade;

// Zod schemas for validation (matching original validation behavior)
export const characterCreateInputSchema = z.object({
	realmId: z.string().min(1),
	name: z.string().min(1).max(200),
	gender: z.string().max(50).nullish(),
	referenceImageKey: z.string().max(500).nullish(),
	notes: z.string().max(10000).nullish(),
});

export const characterUpdateInputSchema = z.object({
	id: z.string().min(1),
	realmId: z.string().min(1).optional(),
	name: z.string().min(1).max(200).optional(),
	gender: z.string().max(50).nullish(),
	referenceImageKey: z.string().max(500).nullish(),
	notes: z.string().max(10000).nullish(),
});

export const characterIdOnlySchema = z.object({
	id: z.string().min(1),
});

export const characterListInputSchema = z.object({
	realmId: z.string().min(1),
});
// Trait schemas
export const traitIdSchema = z.string().min(1);
export const traitNameSchema = z.string().min(1).max(100);
export const traitDescriptionSchema = z.string().max(2000).nullish();
export const traitDisplayModeSchema = z.enum(["number", "grade"]);

export const traitCreateInputSchema = z.object({
	realmId: z.string().min(1),
	name: traitNameSchema,
	description: traitDescriptionSchema.optional(),
	displayMode: traitDisplayModeSchema.optional(),
});

export const traitUpdateInputSchema = z.object({
	id: traitIdSchema,
	name: traitNameSchema.optional(),
	description: traitDescriptionSchema.optional(),
	displayMode: traitDisplayModeSchema.optional(),
});

export const traitListInputSchema = z.object({
	realmId: z.string().min(1),
});

export const traitIdOnlySchema = traitIdSchema;

// Input types for mutations
export interface CharacterCreateInput {
	realmId: string;
	name: string;
	gender?: string | null;
	referenceImageKey?: string | null;
	notes?: string | null;
}

export interface CharacterUpdateInput {
	id: string;
	realmId?: string;
	name?: string;
	gender?: string | null;
	referenceImageKey?: string | null;
	notes?: string | null;
}

export interface CharacterIdOnlyInput {
	id: string;
}

export interface CharacterListInput {
	realmId: string;
}

export interface RealmCreateInput {
	name: string;
	description?: string | null;
	password?: string | null;
	templateRealmId?: string | null;
}

export interface RealmUpdateInput {
	id: string;
	name?: string;
	description?: string | null;
	password?: string | null;
}

// Zod schemas for validation (matching original validation behavior)
export const realmIdSchema = z
	.string()
	.length(7)
	.regex(/^[A-Za-z0-9]+$/, "Realm ID must contain only letters and numbers");

export const realmNameSchema = z.string().min(1).max(200);
export const realmDescriptionSchema = z.string().max(2000).nullish();
export const realmPasswordSchema = z.string().min(1).max(32).nullish();

export const realmCreateInputSchema = z.object({
	name: realmNameSchema,
	description: realmDescriptionSchema,
	password: realmPasswordSchema.nullish(),
	templateRealmId: realmIdSchema.nullish(),
});

export const realmJoinInputSchema = z.object({
	realmId: realmIdSchema,
	password: realmPasswordSchema.nullish(),
});

export const realmUpdateInputSchema = z.object({
	id: realmIdSchema,
	name: realmNameSchema.optional(),
	description: realmDescriptionSchema.optional(),
	password: realmPasswordSchema.nullish(),
});

export const realmTransferOwnershipInputSchema = z.object({
	realmId: realmIdSchema,
	newOwnerUserId: z.string().min(1),
});

export interface TraitCreateInput {
	realmId: string;
	name: string;
	description?: string | null;
	displayMode?: "number" | "grade";
}

export interface TraitUpdateInput {
	id: string;
	name?: string;
	description?: string | null;
	displayMode?: "number" | "grade";
}

export interface RatingCreateOrUpdateInput {
	characterId: string;
	traitId: string;
	value: RatingValue;
}

// Helper function to map grade to numeric value
export function mapGradeToValue(value: RatingValue): number {
	if (typeof value === "number") return value;
	const idx = TRAIT_GRADES.indexOf(value);
	return idx + 1; // 1..20
}

// Helper function to map numeric value to grade
export function mapValueToGrade(value: number): TraitGrade {
	if (value < 1 || value > 20) {
		throw new Error("Value must be between 1 and 20");
	}
	return TRAIT_GRADES[value - 1];
}

// Zod schemas for rating inputs (matching original validation behavior)
export const ratingIdSchema = z.string().min(1);

export const ratingValueSchema = z.union([
	z.number().int().min(1).max(20),
	z.enum(TRAIT_GRADES),
]);

export const ratingCreateOrUpdateInputSchema = z.object({
	characterId: z.string().min(1),
	traitId: z.string().min(1),
	value: ratingValueSchema,
});

export const ratingGetByPairInputSchema = z.object({
	characterId: z.string().min(1),
	traitId: z.string().min(1),
});

export const ratingListByCharacterInputSchema = z.object({
	characterId: z.string().min(1),
});
