"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	parseTraitFilters,
	serializeTraitFilter,
	type TraitComparison,
	type TraitFilter,
	traitNameToSlug,
} from "@/lib/character-filters";

export interface UseCharacterFiltersReturn {
	// Filter values from URL
	realmFilter: string | null;
	searchFilter: string;
	genderFilter: string | null;
	creatorFilter: string | null;
	traitFilters: TraitFilter[];
	hasActiveFilters: boolean;

	// Local search state (for debouncing)
	localSearch: string;
	setLocalSearch: (value: string) => void;
	handleSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;

	// Filter actions
	updateUrlParam: (key: string, value: string | null) => void;
	clearAllFilters: () => void;
	addTraitFilter: (traitName: string) => void;
	updateTraitFilter: (
		traitName: string,
		comparison: TraitComparison,
		value: number | null,
		min: number | null,
		max: number | null,
	) => void;
	removeTraitFilter: (traitName: string) => void;
	clearAllFiltersInDialog: () => void;
}

export function useCharacterFilters(): UseCharacterFiltersReturn {
	const router = useRouter();
	const searchParams = useSearchParams();

	// Get filters from URL
	const realmFilter = searchParams?.get("realm") ?? null;
	const searchFilter = searchParams?.get("search") ?? "";
	const genderFilter = searchParams?.get("gender") ?? null;
	const creatorFilter = searchParams?.get("creator") ?? null;
	const traitFilters = useMemo(
		() => parseTraitFilters(searchParams),
		[searchParams],
	);

	const [localSearch, setLocalSearch] = useState(searchFilter);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isUpdatingRef = useRef(false);

	// Sync localSearch with URL when searchFilter changes from external navigation
	useEffect(() => {
		// Only sync if this isn't our own update
		if (!isUpdatingRef.current) {
			setLocalSearch(searchFilter);
		}
		isUpdatingRef.current = false;
	}, [searchFilter]);

	// Helper to update URL params
	const updateUrlParams = useCallback(
		(updates: Record<string, string | null>) => {
			const params = new URLSearchParams(searchParams?.toString() ?? "");
			for (const [key, value] of Object.entries(updates)) {
				if (value === null || value === "") {
					params.delete(key);
				} else {
					params.set(key, value);
				}
			}
			const newUrl = params.toString()
				? `/characters?${params.toString()}`
				: "/characters";
			isUpdatingRef.current = true;
			router.push(newUrl as never);
		},
		[router, searchParams],
	);

	const updateUrlParam = useCallback(
		(key: string, value: string | null) => {
			updateUrlParams({ [key]: value });
		},
		[updateUrlParams],
	);

	// Debounced URL update for search
	useEffect(() => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = setTimeout(() => {
			if (localSearch !== searchFilter) {
				updateUrlParam("search", localSearch || null);
			}
		}, 300);
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [localSearch, searchFilter, updateUrlParam]);

	const clearAllFilters = useCallback(() => {
		// Preserve realm filter when clearing other filters
		if (realmFilter) {
			router.push(`/characters?realm=${realmFilter}` as never);
		} else {
			router.push("/characters" as never);
		}
		setLocalSearch("");
	}, [router, realmFilter]);

	// Add a trait filter (by name for cross-realm support)
	const addTraitFilter = useCallback(
		(traitName: string) => {
			const params = new URLSearchParams(searchParams?.toString() ?? "");
			params.set(`trait.${traitNameToSlug(traitName)}`, "gte.10"); // Default to "at least 10"
			router.push(`/characters?${params.toString()}` as never);
		},
		[router, searchParams],
	);

	// Update a trait filter
	const updateTraitFilter = useCallback(
		(
			traitName: string,
			comparison: TraitComparison,
			value: number | null,
			min: number | null,
			max: number | null,
		) => {
			const params = new URLSearchParams(searchParams?.toString() ?? "");
			const serialized = serializeTraitFilter({
				traitName,
				comparison,
				value,
				min,
				max,
			});
			params.set(`trait.${traitNameToSlug(traitName)}`, serialized);
			router.push(`/characters?${params.toString()}` as never);
		},
		[router, searchParams],
	);

	// Remove a trait filter
	const removeTraitFilter = useCallback(
		(traitName: string) => {
			const params = new URLSearchParams(searchParams?.toString() ?? "");
			params.delete(`trait.${traitNameToSlug(traitName)}`);
			const newUrl = params.toString()
				? `/characters?${params.toString()}`
				: "/characters";
			router.push(newUrl as never);
		},
		[router, searchParams],
	);

	// Clear filters in dialog (preserves realm and search)
	const clearAllFiltersInDialog = useCallback(() => {
		const params = new URLSearchParams(searchParams?.toString() ?? "");
		// Remove trait filters
		for (const filter of traitFilters) {
			params.delete(`trait.${traitNameToSlug(filter.traitName)}`);
		}
		// Remove gender filter
		params.delete("gender");
		const newUrl = params.toString()
			? `/characters?${params.toString()}`
			: "/characters";
		router.push(newUrl as never);
	}, [router, searchParams, traitFilters]);

	// Handle search on Enter (immediate update, bypassing debounce)
	const handleSearchKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				if (debounceRef.current) {
					clearTimeout(debounceRef.current);
				}
				isUpdatingRef.current = true;
				updateUrlParam("search", localSearch || null);
			}
		},
		[localSearch, updateUrlParam],
	);

	const hasActiveFilters =
		!!searchFilter ||
		!!genderFilter ||
		!!creatorFilter ||
		traitFilters.length > 0;

	return {
		realmFilter,
		searchFilter,
		genderFilter,
		creatorFilter,
		traitFilters,
		hasActiveFilters,
		localSearch,
		setLocalSearch,
		handleSearchKeyDown,
		updateUrlParam,
		clearAllFilters,
		addTraitFilter,
		updateTraitFilter,
		removeTraitFilter,
		clearAllFiltersInDialog,
	};
}
