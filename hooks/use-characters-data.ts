"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { TraitFilter } from "@/lib/character-filters";
import { characterQueries, queryClient, realmQueries } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";

interface UseCharactersDataOptions {
	realmFilter: string | null;
	searchFilter: string;
	localSearch: string;
	genderFilter: string | null;
	creatorFilter: string | null;
	traitFilters: TraitFilter[];
}

export function useCharactersData({
	realmFilter,
	searchFilter,
	localSearch,
	genderFilter,
	creatorFilter,
	traitFilters,
}: UseCharactersDataOptions) {
	// Fetch realms
	const {
		data: realms,
		error,
		isPending: realmsLoading,
	} = useQuery({
		...realmQueries.list(),
		retry: 2,
		retryDelay: 1000,
	});

	// Get characters from all realms (or just filtered realm)
	const realmIds = useMemo(() => {
		if (realmFilter) {
			return [realmFilter];
		}
		return realms?.map((realm) => realm.id) ?? [];
	}, [realms, realmFilter]);

	const characterQueriesResult = useQueries({
		queries: realmIds.map((realmId) => ({
			...characterQueries.list(realmId),
			enabled: !!realmId,
		})),
	});

	const isLoading =
		realmsLoading || characterQueriesResult.some((q) => q.isPending);

	// Combine all characters with realm info
	const allCharacters = useMemo(() => {
		const characters: Array<{
			character: NonNullable<(typeof characterQueriesResult)[0]["data"]>[0];
			realm: NonNullable<typeof realms>[0] | undefined;
		}> = [];

		characterQueriesResult.forEach((query, index) => {
			const realmId = realmIds[index];
			const realm = realms?.find((r) => r.id === realmId);
			const realmCharacters = query.data ?? [];

			realmCharacters.forEach((character) => {
				characters.push({ character, realm });
			});
		});

		// Sort alphabetically by name
		return characters.sort((a, b) => {
			const aName = a.character.name.toLowerCase();
			const bName = b.character.name.toLowerCase();
			return aName.localeCompare(bName);
		});
	}, [characterQueriesResult, realmIds, realms]);

	// Apply filters and separate into rated/unrated groups
	const { filteredCharacters, unratedCharacters } = useMemo(() => {
		let filtered = allCharacters;

		// Apply search filter
		const query = (localSearch || searchFilter).trim().toLowerCase();
		if (query) {
			filtered = filtered.filter(
				(item) =>
					item.character.name.toLowerCase().includes(query) ||
					(item.character.notes
						? item.character.notes.toLowerCase().includes(query)
						: false),
			);
		}

		// Apply gender filter
		if (genderFilter) {
			filtered = filtered.filter(
				(item) => item.character.gender === genderFilter,
			);
		}

		// Apply creator filter
		if (creatorFilter) {
			filtered = filtered.filter(
				(item) => item.character.userName === creatorFilter,
			);
		}

		// Apply trait filters (by name for cross-realm support)
		if (traitFilters.length > 0) {
			const rated: typeof filtered = [];
			const unrated: typeof filtered = [];

			for (const item of filtered) {
				const ratings = item.character.ratingsSummary;

				// Check if character has ratings for the filtered traits
				const hasRelevantRatings = traitFilters.some((filter) => {
					const rating = ratings?.find(
						(r) => r.traitName.toLowerCase() === filter.traitName.toLowerCase(),
					);
					return rating && typeof rating.value === "number";
				});

				if (!hasRelevantRatings) {
					// No ratings for any filtered traits - put in unrated group
					unrated.push(item);
					continue;
				}

				// Check if all trait filters match
				const matchesAllFilters = traitFilters.every((filter) => {
					const rating = ratings?.find(
						(r) => r.traitName.toLowerCase() === filter.traitName.toLowerCase(),
					);
					if (!rating || typeof rating.value !== "number") {
						return false;
					}

					const min = filter.min ?? 1;
					const max = filter.max ?? 20;
					return rating.value >= min && rating.value <= max;
				});

				if (matchesAllFilters) {
					rated.push(item);
				}
			}

			return { filteredCharacters: rated, unratedCharacters: unrated };
		}

		return { filteredCharacters: filtered, unratedCharacters: [] };
	}, [
		allCharacters,
		localSearch,
		searchFilter,
		genderFilter,
		creatorFilter,
		traitFilters,
	]);

	// Get available filter options
	const { availableGenders, availableCreators } = useMemo(() => {
		const genders = new Set<string>();
		const creators = new Set<string>();

		allCharacters.forEach((item) => {
			if (item.character.gender) genders.add(item.character.gender);
			if (item.character.userName) creators.add(item.character.userName);
		});

		return {
			availableGenders: Array.from(genders).sort(),
			availableCreators: Array.from(creators).sort(),
		};
	}, [allCharacters]);

	// Get all unique trait names from all characters (for cross-realm filtering)
	const availableTraitNames = useMemo(() => {
		const traitNames = new Set<string>();
		allCharacters.forEach((item) => {
			item.character.ratingsSummary?.forEach((rating) => {
				if (rating.traitName) {
					traitNames.add(rating.traitName);
				}
			});
		});
		return Array.from(traitNames).sort();
	}, [allCharacters]);

	// Get trait names that aren't already filtered
	const availableTraitsToFilter = useMemo(() => {
		const filteredTraitNames = new Set(
			traitFilters.map((f) => f.traitName.toLowerCase()),
		);
		return availableTraitNames.filter(
			(name) => !filteredTraitNames.has(name.toLowerCase()),
		);
	}, [availableTraitNames, traitFilters]);

	// Get display mode for a trait name (check from any character's ratings)
	const getTraitDisplayMode = useCallback(
		(traitName: string): "number" | "grade" => {
			for (const item of allCharacters) {
				const rating = item.character.ratingsSummary?.find(
					(r) => r.traitName.toLowerCase() === traitName.toLowerCase(),
				);
				if (rating) {
					return rating.displayMode;
				}
			}
			return "number";
		},
		[allCharacters],
	);

	const invalidateCharacters = useCallback(() => {
		realmIds.forEach((realmId) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.character.list(realmId),
			});
		});
	}, [realmIds]);

	// Get the filtered realm name for display
	const filteredRealmName = useMemo(() => {
		if (!realmFilter) return null;
		return realms?.find((r) => r.id === realmFilter)?.name ?? null;
	}, [realmFilter, realms]);

	return {
		realms,
		error,
		realmsLoading,
		isLoading,
		filteredCharacters,
		unratedCharacters,
		availableGenders,
		availableCreators,
		availableTraitsToFilter,
		getTraitDisplayMode,
		invalidateCharacters,
		filteredRealmName,
	};
}
