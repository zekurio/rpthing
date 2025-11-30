"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { Filter, Plus, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CharacterGallery } from "@/components/character-gallery";
import { CharactersEmptyState } from "@/components/characters-empty-state";
import { CharactersErrorState } from "@/components/characters-error-state";
import { CharactersFilterDialog } from "@/components/characters-filter-dialog";
import { CharactersLoadingState } from "@/components/characters-loading-state";
import { CharactersPageHeader } from "@/components/characters-page-header";
import { CreateCharacterDialog } from "@/components/create-character-dialog";
import { CreateOrJoinRealmDialog } from "@/components/create-or-join-realm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import {
	parseTraitFilters,
	serializeTraitFilter,
	type TraitComparison,
	traitNameToSlug,
} from "@/lib/character-filters";
import { queryClient, trpc } from "@/lib/trpc";

export default function CharactersPage() {
	return (
		<Suspense
			fallback={
				<div className="flex h-full items-center justify-center">
					<LoadingSpinner size="lg" />
				</div>
			}
		>
			<CharactersPageContent />
		</Suspense>
	);
}

function CharactersPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	useAuth();

	// Get filters from URL
	const realmFilter = searchParams?.get("realm") ?? null;
	const searchFilter = searchParams?.get("search") ?? "";
	const genderFilter = searchParams?.get("gender") ?? null;
	const creatorFilter = searchParams?.get("creator") ?? null;
	const traitFilters = useMemo(
		() => parseTraitFilters(searchParams),
		[searchParams],
	);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [createCharacterOpen, setCreateCharacterOpen] = useState(false);
	const [localSearch, setLocalSearch] = useState(searchFilter);
	const [traitFilterOpen, setTraitFilterOpen] = useState(false);

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

	// Fetch realms
	const {
		data: realms,
		error,
		isPending: realmsLoading,
	} = useQuery({
		...trpc.realm.list.queryOptions(),
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

	const characterQueries = useQueries({
		queries: realmIds.map((realmId) => ({
			...trpc.character.list.queryOptions({ realmId }),
			enabled: !!realmId,
		})),
	});

	const isLoading = realmsLoading || characterQueries.some((q) => q.isPending);

	// Combine all characters with realm info
	const allCharacters = useMemo(() => {
		const characters: Array<{
			character: NonNullable<(typeof characterQueries)[0]["data"]>[0];
			realm: NonNullable<typeof realms>[0] | undefined;
		}> = [];

		characterQueries.forEach((query, index) => {
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
	}, [characterQueries, realmIds, realms]);

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

	const hasActiveFilters =
		!!searchFilter ||
		!!genderFilter ||
		!!creatorFilter ||
		traitFilters.length > 0;

	const invalidateCharacters = useCallback(() => {
		realmIds.forEach((realmId) => {
			queryClient.invalidateQueries({
				queryKey: trpc.character.list.queryKey({ realmId }),
			});
		});
	}, [realmIds]);

	// Get the filtered realm name for display
	const filteredRealmName = useMemo(() => {
		if (!realmFilter) return null;
		return realms?.find((r) => r.id === realmFilter)?.name ?? null;
	}, [realmFilter, realms]);

	// Handle search on Enter
	const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			updateUrlParam("search", localSearch || null);
		}
	};

	// Loading state
	if (realmsLoading) {
		return (
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<CharactersPageHeader filteredRealmName={filteredRealmName} />
					<div className="flex h-full min-h-0 w-full flex-col">
						<main className="flex-1 overflow-y-auto p-6">
							<CharactersLoadingState />
						</main>
					</div>
				</SidebarInset>
			</SidebarProvider>
		);
	}

	// Error state
	if (error) {
		return (
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<CharactersPageHeader filteredRealmName={filteredRealmName} />
					<div className="flex h-full min-h-0 w-full flex-col">
						<main className="flex-1 overflow-y-auto p-6">
							<CharactersErrorState />
						</main>
					</div>
				</SidebarInset>
			</SidebarProvider>
		);
	}

	// No realms state
	if (!realms || realms.length === 0) {
		return (
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<CharactersPageHeader filteredRealmName={filteredRealmName} />
					<div className="flex h-full min-h-0 w-full flex-col">
						<main className="flex-1 overflow-y-auto p-6">
							<CharactersEmptyState
								type="no-realms"
								onCreateRealm={() => setDialogOpen(true)}
							/>
						</main>
						<CreateOrJoinRealmDialog
							open={dialogOpen}
							onOpenChange={setDialogOpen}
						/>
					</div>
				</SidebarInset>
			</SidebarProvider>
		);
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<CharactersPageHeader filteredRealmName={filteredRealmName} />
				<div className="flex h-full min-h-0 w-full flex-col">
					<main className="scrollbar-none flex-1 overflow-y-auto p-6 [scrollbar-gutter:stable]">
						<div className="space-y-6">
							{/* Search and Filter */}
							<div className="mx-auto flex w-full max-w-xl items-center gap-2">
								<div className="relative flex-1">
									<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
									<Input
										value={localSearch}
										onChange={(e) => setLocalSearch(e.target.value)}
										onKeyDown={handleSearchKeyDown}
										onBlur={() => updateUrlParam("search", localSearch || null)}
										placeholder="Search characters..."
										className="pl-9"
									/>
								</div>
								<Button
									variant="outline"
									size="icon"
									className="relative shrink-0"
									onClick={() => setTraitFilterOpen(true)}
								>
									<Filter className="h-4 w-4" />
									{(traitFilters.length > 0 ||
										genderFilter ||
										creatorFilter) && (
										<span className="-right-1.5 -top-1.5 absolute flex h-5 w-5 items-center justify-center rounded-full bg-primary font-medium text-[11px] text-primary-foreground">
											{traitFilters.length +
												(genderFilter ? 1 : 0) +
												(creatorFilter ? 1 : 0)}
										</span>
									)}
								</Button>
							</div>

							{/* Filter Dialog */}
							<CharactersFilterDialog
								open={traitFilterOpen}
								onOpenChange={setTraitFilterOpen}
								genderFilter={genderFilter}
								creatorFilter={creatorFilter}
								updateUrlParam={updateUrlParam}
								availableGenders={availableGenders}
								availableCreators={availableCreators}
								availableTraitsToFilter={availableTraitsToFilter}
								traitFilters={traitFilters}
								addTraitFilter={addTraitFilter}
								getTraitDisplayMode={getTraitDisplayMode}
								updateTraitFilter={updateTraitFilter}
								removeTraitFilter={removeTraitFilter}
								clearAllFiltersInDialog={clearAllFiltersInDialog}
							/>

							{/* Characters Grid */}
							{isLoading ? (
								<div className="flex h-64 items-center justify-center">
									<LoadingSpinner size="lg" />
								</div>
							) : filteredCharacters.length > 0 ||
								unratedCharacters.length > 0 ? (
								<div className="space-y-8">
									{/* Rated/Matched Characters */}
									{filteredCharacters.length > 0 && (
										<CharacterGallery
											items={filteredCharacters.map((item) => item.character)}
											onChanged={invalidateCharacters}
											realmId={realmFilter ?? undefined}
										/>
									)}

									{/* Unrated Characters Section */}
									{unratedCharacters.length > 0 && (
										<div className="space-y-4">
											<div className="flex items-center gap-2">
												<h4 className="font-medium text-muted-foreground text-sm">
													Unrated for selected traits
												</h4>
												<span className="text-muted-foreground text-xs">
													({unratedCharacters.length} character
													{unratedCharacters.length === 1 ? "" : "s"})
												</span>
											</div>
											<CharacterGallery
												items={unratedCharacters.map((item) => item.character)}
												onChanged={invalidateCharacters}
												realmId={realmFilter ?? undefined}
											/>
										</div>
									)}
								</div>
							) : (
								<CharactersEmptyState
									type="no-results"
									hasActiveFilters={hasActiveFilters}
									onClearFilters={clearAllFilters}
								/>
							)}
						</div>
					</main>
				</div>

				{/* Floating create button */}
				<Button
					size="icon"
					onClick={() => setCreateCharacterOpen(true)}
					className="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full shadow-lg"
					aria-label="Create character"
				>
					<Plus className="h-6 w-6" />
				</Button>

				{/* Create character dialog */}
				<CreateCharacterDialog
					open={createCharacterOpen}
					onOpenChange={setCreateCharacterOpen}
					realmId={realmFilter ?? undefined}
					onCreated={invalidateCharacters}
				/>
			</SidebarInset>
		</SidebarProvider>
	);
}
