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

export type CharacterListItem = {
	id: string;
	name: string;
	gender: string | null;
	referenceImageKey: string | null;
	croppedImageKey?: string | null;
	ownerId?: string;
	ownerName?: string | null;
	createdAt?: string | Date;
	updatedAt?: string | Date;
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
