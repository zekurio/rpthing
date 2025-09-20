export type Trait = {
	id: string;
	name: string;
	description: string | null;
	displayMode: "number" | "grade";
	realmId: string;
	createdByUserId?: string;
	createdByName?: string | null;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};

export type CharacterData = {
	id: string;
	realmId: string;
	name: string;
	gender: string | null;
	referenceImageKey: string | null;
	croppedImageKey: string | null;
	notes: string | null;
	userId: string;
	userName?: string | null;
	createdAt: string;
	updatedAt: string;
};

export type CharacterListItem = Omit<
	CharacterData,
	"createdAt" | "updatedAt" | "userId" | "userName"
> & {
	// Optional precomputed ratings summary for displaying badges without extra requests
	ratingsSummary?: CharacterTraitRating[];
	userId?: string;
	userName?: string | null;
	createdAt?: string;
	updatedAt?: string;
	croppedImageKey?: string | null;
};

export type CharacterTraitRating = {
	traitId: string;
	traitName: string;
	description: string | null;
	displayMode: "number" | "grade";
	ratingId: string | null;
	value: number | null;
};

export type CharacterWithRatings = {
	id: string;
	realmId: string;
	name: string;
	traits: CharacterTraitRating[];
};
