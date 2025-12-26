/**
 * Query key factory for TanStack Query cache management
 *
 * Provides consistent, hierarchical query keys for all API endpoints.
 * Follows the pattern: [resource, action, ...params]
 */
export const queryKeys = {
	realm: {
		all: ["realm"] as const,
		list: () => [...queryKeys.realm.all, "list"] as const,
		byId: (id: string) => [...queryKeys.realm.all, "byId", id] as const,
		members: (id: string) => [...queryKeys.realm.all, "members", id] as const,
		owner: (id: string) => [...queryKeys.realm.all, "owner", id] as const,
	},
	character: {
		all: ["character"] as const,
		list: (realmId: string) =>
			[...queryKeys.character.all, "list", realmId] as const,
		byId: (id: string) => [...queryKeys.character.all, "byId", id] as const,
		withRatings: (id: string) =>
			[...queryKeys.character.all, "withRatings", id] as const,
	},
	trait: {
		all: ["trait"] as const,
		list: (realmId: string) =>
			[...queryKeys.trait.all, "list", realmId] as const,
		byId: (id: string) => [...queryKeys.trait.all, "byId", id] as const,
	},
	rating: {
		all: ["rating"] as const,
		byId: (id: string) => [...queryKeys.rating.all, "byId", id] as const,
		byPair: (characterId: string, traitId: string) =>
			[...queryKeys.rating.all, "byPair", characterId, traitId] as const,
		byCharacter: (characterId: string) =>
			[...queryKeys.rating.all, "byCharacter", characterId] as const,
	},
} as const;
