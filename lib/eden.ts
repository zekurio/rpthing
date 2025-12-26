import { treaty } from "@elysiajs/eden";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { App } from "@/server/elysia";
import { queryKeys } from "./query-keys";

/**
 * Eden client for the Elysia API
 *
 * Uses treaty for type-safe API calls with automatic path inference.
 * Credentials are included for auth cookies.
 */
export const api = treaty<App>(
	typeof window === "undefined"
		? `http://localhost:${process.env.PORT || 3000}`
		: window.location.origin,
	{
		fetch: {
			credentials: "include",
		},
	},
);

/**
 * Query client for TanStack Query
 */
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			staleTime: 5 * 60 * 1000,
			gcTime: 30 * 60 * 1000,
		},
	},
	queryCache: new QueryCache({
		onError: (error) => {
			toast.error(error.message, {
				action: {
					label: "retry",
					onClick: () => {
						queryClient.invalidateQueries();
					},
				},
			});
		},
	}),
});

/**
 * Helper to unwrap Eden responses and throw on error
 */
export function unwrap<T>(
	result:
		| { data: T; error: null }
		| { data: null; error: { status: number; value: unknown } },
): T {
	if (result.error) {
		const errorValue = result.error.value;
		const message =
			typeof errorValue === "object" &&
			errorValue !== null &&
			"error" in errorValue &&
			typeof (errorValue as { error: string }).error === "string"
				? (errorValue as { error: string }).error
				: `Request failed with status ${result.error.status}`;
		throw new Error(message);
	}
	return result.data;
}

// ============================================================================
// Query Option Factories
// ============================================================================

/**
 * Realm query options
 */
export const realmQueries = {
	list: () => ({
		queryKey: queryKeys.realm.list(),
		queryFn: async () => unwrap(await api.api.realm.get()),
	}),
	byId: (realmId: string) => ({
		queryKey: queryKeys.realm.byId(realmId),
		queryFn: async () => unwrap(await api.api.realm({ realmId }).get()),
	}),
	members: (realmId: string) => ({
		queryKey: queryKeys.realm.members(realmId),
		queryFn: async () => unwrap(await api.api.realm({ realmId }).members.get()),
	}),
	owner: (realmId: string) => ({
		queryKey: queryKeys.realm.owner(realmId),
		queryFn: async () => unwrap(await api.api.realm({ realmId }).owner.get()),
	}),
};

/**
 * Character query options
 */
export const characterQueries = {
	list: (realmId: string) => ({
		queryKey: queryKeys.character.list(realmId),
		queryFn: async () =>
			unwrap(await api.api.character.get({ query: { realmId } })),
	}),
	byId: (id: string) => ({
		queryKey: queryKeys.character.byId(id),
		queryFn: async () => unwrap(await api.api.character({ id }).get()),
	}),
	withRatings: (id: string) => ({
		queryKey: queryKeys.character.withRatings(id),
		queryFn: async () => unwrap(await api.api.character({ id }).ratings.get()),
	}),
};

/**
 * Trait query options
 */
export const traitQueries = {
	list: (realmId: string) => ({
		queryKey: queryKeys.trait.list(realmId),
		queryFn: async () =>
			unwrap(await api.api.trait.get({ query: { realmId } })),
	}),
	byId: (id: string) => ({
		queryKey: queryKeys.trait.byId(id),
		queryFn: async () => unwrap(await api.api.trait({ id }).get()),
	}),
};

/**
 * Rating query options
 */
export const ratingQueries = {
	byId: (id: string) => ({
		queryKey: queryKeys.rating.byId(id),
		queryFn: async () => unwrap(await api.api.rating({ id }).get()),
	}),
	byPair: (characterId: string, traitId: string) => ({
		queryKey: queryKeys.rating.byPair(characterId, traitId),
		queryFn: async () =>
			unwrap(
				await api.api.rating.pair.get({ query: { characterId, traitId } }),
			),
	}),
	byCharacter: (characterId: string) => ({
		queryKey: queryKeys.rating.byCharacter(characterId),
		queryFn: async () =>
			unwrap(await api.api.rating.character({ characterId }).get()),
	}),
};

// ============================================================================
// Mutation Helpers
// ============================================================================

/**
 * Realm mutations
 */
export const realmMutations = {
	create: async (data: {
		name: string;
		description?: string;
		password?: string;
		templateRealmId?: string;
	}) => unwrap(await api.api.realm.post(data)),
	update: async (
		realmId: string,
		data: { name?: string; description?: string; password?: string | null },
	) => unwrap(await api.api.realm({ realmId }).patch(data)),
	delete: async (realmId: string) =>
		unwrap(await api.api.realm({ realmId }).delete()),
	join: async (data: { realmId: string; password?: string }) =>
		unwrap(
			await api.api
				.realm({ realmId: data.realmId })
				.join.post({ password: data.password }),
		),
	leave: async (realmId: string) =>
		unwrap(await api.api.realm({ realmId }).leave.post({})),
	transferOwnership: async (realmId: string, newOwnerUserId: string) =>
		unwrap(await api.api.realm({ realmId }).transfer.post({ newOwnerUserId })),
};

/**
 * Character mutations
 */
export const characterMutations = {
	create: async (data: {
		name: string;
		realmId: string;
		gender?: string;
		notes?: string;
	}) => unwrap(await api.api.character.post(data)),
	update: async (
		id: string,
		data: {
			name?: string;
			gender?: string;
			notes?: string | null;
			realmId?: string;
		},
	) => unwrap(await api.api.character({ id }).patch(data)),
	delete: async (id: string) =>
		unwrap(await api.api.character({ id }).delete()),
};

/**
 * Trait mutations
 */
export const traitMutations = {
	create: async (data: {
		name: string;
		realmId: string;
		description?: string;
		displayMode?: "number" | "grade";
	}) => unwrap(await api.api.trait.post(data)),
	update: async (
		id: string,
		data: {
			name?: string;
			description?: string;
			displayMode?: "number" | "grade";
		},
	) => unwrap(await api.api.trait({ id }).patch(data)),
	delete: async (id: string) => unwrap(await api.api.trait({ id }).delete()),
};

/**
 * Rating mutations
 */
export const ratingMutations = {
	upsert: async (data: {
		characterId: string;
		traitId: string;
		value: number;
	}) => unwrap(await api.api.rating.put(data)),
	delete: async (id: string) => unwrap(await api.api.rating({ id }).delete()),
};
