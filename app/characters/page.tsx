"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { Filter, Plus, Search, Users, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CharacterGallery } from "@/components/character-gallery";
import { CreateCharacterDialog } from "@/components/create-character-dialog";
import { CreateOrJoinRealmDialog } from "@/components/create-or-join-realm-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingText } from "@/components/ui/loading";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { gradeForValue } from "@/lib/traits";
import { queryClient, trpc } from "@/lib/trpc";

// Type for parsed trait filters (now uses trait name for cross-realm filtering)
interface TraitFilter {
	traitName: string;
	min: number | null;
	max: number | null;
}

// Parse trait filters from URL search params
function parseTraitFilters(
	searchParams: URLSearchParams | null,
): TraitFilter[] {
	if (!searchParams) return [];
	const filters: TraitFilter[] = [];

	searchParams.forEach((value, key) => {
		if (key.startsWith("trait.")) {
			const traitName = decodeURIComponent(key.slice(6)); // Remove "trait." prefix and decode
			const [minStr, maxStr] = value.split("-");
			const min = minStr ? Number.parseInt(minStr, 10) : null;
			const max = maxStr ? Number.parseInt(maxStr, 10) : null;
			if (traitName && (min !== null || max !== null)) {
				filters.push({
					traitName,
					min: min && !Number.isNaN(min) ? min : null,
					max: max && !Number.isNaN(max) ? max : null,
				});
			}
		}
	});

	return filters;
}

// Generate score options for select dropdowns
function getScoreOptions() {
	const options = [];
	for (let score = 1; score <= 20; score++) {
		const grade = gradeForValue(score);
		options.push({
			value: score.toString(),
			label: `${score} (${grade})`,
		});
	}
	return options;
}

function CharactersSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{Array.from({ length: 10 }, (_, i) => `skeleton-${i}`).map((key) => (
				<Skeleton key={key} className="aspect-[3/4] w-full rounded-lg" />
			))}
		</div>
	);
}

export default function CharactersPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { user } = useAuth();

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
			params.set(`trait.${encodeURIComponent(traitName)}`, "1-20"); // Default to full range
			router.push(`/characters?${params.toString()}` as never);
		},
		[router, searchParams],
	);

	// Update a trait filter
	const updateTraitFilter = useCallback(
		(traitName: string, min: number | null, max: number | null) => {
			const params = new URLSearchParams(searchParams?.toString() ?? "");
			const minStr = min?.toString() ?? "";
			const maxStr = max?.toString() ?? "";
			params.set(
				`trait.${encodeURIComponent(traitName)}`,
				`${minStr}-${maxStr}`,
			);
			router.push(`/characters?${params.toString()}` as never);
		},
		[router, searchParams],
	);

	// Remove a trait filter
	const removeTraitFilter = useCallback(
		(traitName: string) => {
			const params = new URLSearchParams(searchParams?.toString() ?? "");
			params.delete(`trait.${encodeURIComponent(traitName)}`);
			const newUrl = params.toString()
				? `/characters?${params.toString()}`
				: "/characters";
			router.push(newUrl as never);
		},
		[router, searchParams],
	);

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
				// Only show user's own characters
				if (user && character.userId === user.id) {
					characters.push({ character, realm });
				}
			});
		});

		// Sort alphabetically by name
		return characters.sort((a, b) => {
			const aName = a.character.name.toLowerCase();
			const bName = b.character.name.toLowerCase();
			return aName.localeCompare(bName);
		});
	}, [characterQueries, realmIds, realms, user]);

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
		searchFilter || genderFilter || creatorFilter || traitFilters.length > 0;

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

	const scoreOptions = useMemo(() => getScoreOptions(), []);

	// Loading state
	if (realmsLoading) {
		return (
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<div className="sticky top-0 isolate z-10 flex h-14 items-center gap-2 border-border border-b bg-background/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:overflow-hidden md:rounded-t-xl">
						<SidebarTrigger />
						<div className="font-semibold">Characters</div>
					</div>
					<div className="flex h-full min-h-0 w-full flex-col">
						<main className="flex-1 overflow-y-auto p-6">
							<div className="flex h-full flex-col items-center justify-center text-center">
								<LoadingText text="Loading..." size="lg" />
							</div>
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
					<div className="sticky top-0 isolate z-10 flex h-14 items-center gap-2 border-border border-b bg-background/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:overflow-hidden md:rounded-t-xl">
						<SidebarTrigger />
						<div className="font-semibold">Characters</div>
					</div>
					<div className="flex h-full min-h-0 w-full flex-col">
						<main className="flex-1 overflow-y-auto p-6">
							<div className="flex h-full flex-col items-center justify-center text-center">
								<div className="mb-4 text-6xl">❌</div>
								<h1 className="font-bold text-2xl">Something went wrong</h1>
								<p className="mt-2 max-w-md text-muted-foreground">
									Unable to load characters. Please try again.
								</p>
								<div className="mt-6">
									<Button onClick={() => window.location.reload()}>
										Retry
									</Button>
								</div>
							</div>
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
					<div className="sticky top-0 isolate z-10 flex h-14 items-center gap-2 border-border border-b bg-background/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:overflow-hidden md:rounded-t-xl">
						<SidebarTrigger />
						<div className="font-semibold">Characters</div>
					</div>
					<div className="flex h-full min-h-0 w-full flex-col">
						<main className="flex-1 overflow-y-auto p-6">
							<div className="flex h-full flex-col items-center justify-center text-center">
								<div className="mb-4 text-6xl">🧹</div>
								<h1 className="font-bold text-2xl">
									It's quite empty in here.
								</h1>
								<p className="mt-2 max-w-md text-muted-foreground">
									No realms yet... maybe you should create one?
								</p>
								<div className="mt-6">
									<Button onClick={() => setDialogOpen(true)}>
										Create or join a realm
									</Button>
								</div>
							</div>
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
				<div className="sticky top-0 isolate z-10 flex h-14 items-center gap-2 border-border border-b bg-background/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:overflow-hidden md:rounded-t-xl">
					<SidebarTrigger />
					<div className="font-semibold">
						Characters
						{filteredRealmName && (
							<span className="ml-2 text-muted-foreground">
								in {filteredRealmName}
							</span>
						)}
					</div>
				</div>
				<div className="flex h-full min-h-0 w-full flex-col">
					<main className="scrollbar-none flex-1 overflow-y-auto p-6 [scrollbar-gutter:stable]">
						<div className="space-y-6">
							{/* Filters */}
							<div className="flex flex-wrap items-center gap-2">
								{/* Search row with filter button on mobile */}
								<div className="flex w-full items-center gap-2 sm:w-auto">
									<div className="relative flex-1 sm:w-72 sm:flex-none">
										<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
										<Input
											value={localSearch}
											onChange={(e) => setLocalSearch(e.target.value)}
											onKeyDown={handleSearchKeyDown}
											onBlur={() =>
												updateUrlParam("search", localSearch || null)
											}
											placeholder="Search characters..."
											aria-label="Search characters"
											className="pl-9"
										/>
									</div>

									{/* Filter Button - visible on mobile in search row */}
									{(availableGenders.length > 0 ||
										availableTraitNames.length > 0) && (
										<Button
											variant="outline"
											size="icon"
											className="relative shrink-0 sm:hidden"
											aria-label="Filters"
											onClick={() => setTraitFilterOpen(true)}
										>
											<Filter className="h-4 w-4" />
											{(traitFilters.length > 0 || genderFilter) && (
												<div className="-right-1 -top-1 absolute flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
													{traitFilters.length + (genderFilter ? 1 : 0)}
												</div>
											)}
										</Button>
									)}
								</div>

								{/* Creator Filter */}
								{availableCreators.length > 1 && (
									<Select
										value={creatorFilter ?? "all"}
										onValueChange={(value) =>
											updateUrlParam("creator", value === "all" ? null : value)
										}
									>
										<SelectTrigger className="w-[150px]">
											<SelectValue placeholder="All creators" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All creators</SelectItem>
											{availableCreators.map((creator) => (
												<SelectItem key={creator} value={creator}>
													{creator}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}

								{/* Filter Button - hidden on mobile (shown in search row instead) */}
								{(availableGenders.length > 0 ||
									availableTraitNames.length > 0) && (
									<Button
										variant="outline"
										className="relative hidden sm:flex"
										aria-label="Filters"
										onClick={() => setTraitFilterOpen(true)}
									>
										<Filter className="h-4 w-4" />
										{(traitFilters.length > 0 || genderFilter) && (
											<div className="-right-1 -top-1 absolute flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
												{traitFilters.length + (genderFilter ? 1 : 0)}
											</div>
										)}
									</Button>
								)}

								{/* Filter Dialog */}
								<Dialog
									open={traitFilterOpen}
									onOpenChange={setTraitFilterOpen}
								>
									<DialogContent className="max-w-sm">
										<DialogHeader>
											<div className="flex items-center justify-between">
												<DialogTitle>Filters</DialogTitle>
												{(traitFilters.length > 0 || genderFilter) && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => {
															const params = new URLSearchParams(
																searchParams?.toString() ?? "",
															);
															for (const filter of traitFilters) {
																params.delete(
																	`trait.${encodeURIComponent(filter.traitName)}`,
																);
															}
															params.delete("gender");
															const newUrl = params.toString()
																? `/characters?${params.toString()}`
																: "/characters";
															router.push(newUrl as never);
														}}
														className="h-6 px-2 text-muted-foreground hover:text-foreground"
													>
														<X className="mr-1 h-3 w-3" />
														Clear all
													</Button>
												)}
											</div>
										</DialogHeader>

										<div className="space-y-4">
											{availableGenders.length > 0 && (
												<div className="space-y-2">
													<Label className="font-medium text-xs">Gender</Label>
													<Select
														value={genderFilter ?? "all"}
														onValueChange={(value) =>
															updateUrlParam(
																"gender",
																value === "all" ? null : value,
															)
														}
													>
														<SelectTrigger>
															<SelectValue placeholder="All genders" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="all">All genders</SelectItem>
															{availableGenders.map((gender) => (
																<SelectItem key={gender} value={gender}>
																	{gender}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											)}

											{availableTraitsToFilter.length > 0 && (
												<div className="space-y-2">
													<Label className="font-medium text-xs">
														Add trait filter
													</Label>
													<Select
														value=""
														onValueChange={(traitName) => {
															if (traitName) {
																addTraitFilter(traitName);
															}
														}}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select a trait..." />
														</SelectTrigger>
														<SelectContent>
															{availableTraitsToFilter.map((traitName) => (
																<SelectItem key={traitName} value={traitName}>
																	{traitName}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											)}

											{traitFilters.length > 0 && (
												<div className="max-h-60 space-y-3 overflow-y-auto">
													{traitFilters.map((filter) => {
														const displayMode = getTraitDisplayMode(
															filter.traitName,
														);

														return (
															<div
																key={filter.traitName}
																className="space-y-2 rounded-lg border bg-muted/30 p-3"
															>
																<div className="flex items-center justify-between gap-2">
																	<div className="flex items-center gap-2">
																		<span className="font-medium text-xs">
																			{filter.traitName}
																		</span>
																		<span className="text-muted-foreground text-xs capitalize">
																			({displayMode})
																		</span>
																	</div>
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-6 px-2 text-muted-foreground hover:text-foreground"
																		onClick={() =>
																			removeTraitFilter(filter.traitName)
																		}
																		aria-label="Remove trait filter"
																	>
																		<X className="h-3 w-3" />
																	</Button>
																</div>
																<div className="grid grid-cols-2 gap-2">
																	<div className="space-y-1">
																		<Label className="text-muted-foreground text-xs">
																			Min
																		</Label>
																		<Select
																			value={filter.min?.toString() ?? "any"}
																			onValueChange={(value) =>
																				updateTraitFilter(
																					filter.traitName,
																					value === "any"
																						? null
																						: Number.parseInt(value, 10),
																					filter.max,
																				)
																			}
																		>
																			<SelectTrigger className="h-8">
																				<SelectValue placeholder="Any" />
																			</SelectTrigger>
																			<SelectContent>
																				<SelectItem value="any">Any</SelectItem>
																				{scoreOptions.map((option) => (
																					<SelectItem
																						key={option.value}
																						value={option.value}
																					>
																						{option.label}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																	</div>
																	<div className="space-y-1">
																		<Label className="text-muted-foreground text-xs">
																			Max
																		</Label>
																		<Select
																			value={filter.max?.toString() ?? "any"}
																			onValueChange={(value) =>
																				updateTraitFilter(
																					filter.traitName,
																					filter.min,
																					value === "any"
																						? null
																						: Number.parseInt(value, 10),
																				)
																			}
																		>
																			<SelectTrigger className="h-8">
																				<SelectValue placeholder="Any" />
																			</SelectTrigger>
																			<SelectContent>
																				<SelectItem value="any">Any</SelectItem>
																				{scoreOptions.map((option) => (
																					<SelectItem
																						key={option.value}
																						value={option.value}
																					>
																						{option.label}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																	</div>
																</div>
															</div>
														);
													})}
												</div>
											)}

											{traitFilters.length === 0 &&
												availableTraitsToFilter.length === 0 &&
												availableGenders.length === 0 && (
													<p className="text-center text-muted-foreground text-sm">
														No filters available
													</p>
												)}
										</div>
									</DialogContent>
								</Dialog>

								{/* Clear filters button */}
								{hasActiveFilters && (
									<Button
										variant="ghost"
										size="sm"
										onClick={clearAllFilters}
										className="h-9 px-2 text-muted-foreground hover:text-foreground"
									>
										<X className="mr-1 h-4 w-4" />
										Clear filters
									</Button>
								)}
							</div>

							{/* Active trait filter badges */}
							{traitFilters.length > 0 && (
								<div className="flex flex-wrap gap-2">
									{traitFilters.map((filter) => {
										const displayMode = getTraitDisplayMode(filter.traitName);

										const minLabel =
											filter.min !== null
												? displayMode === "grade"
													? gradeForValue(filter.min)
													: filter.min.toString()
												: null;
										const maxLabel =
											filter.max !== null
												? displayMode === "grade"
													? gradeForValue(filter.max)
													: filter.max.toString()
												: null;

										let rangeLabel = "";
										const isMinLowest = filter.min === null || filter.min === 1;
										const isMaxHighest =
											filter.max === null || filter.max === 20;

										if (isMinLowest && isMaxHighest) {
											// Full range - show as "Any" or full range
											rangeLabel = "Any";
										} else if (isMaxHighest && minLabel) {
											// Max is at highest, just show ≥ min
											rangeLabel = `≥ ${minLabel}`;
										} else if (isMinLowest && maxLabel) {
											// Min is at lowest, just show ≤ max
											rangeLabel = `≤ ${maxLabel}`;
										} else if (minLabel && maxLabel) {
											rangeLabel = `${minLabel} - ${maxLabel}`;
										} else if (minLabel) {
											rangeLabel = `≥ ${minLabel}`;
										} else if (maxLabel) {
											rangeLabel = `≤ ${maxLabel}`;
										}

										return (
											<div
												key={filter.traitName}
												className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary text-sm"
											>
												<span className="font-medium">{filter.traitName}:</span>
												<span>{rangeLabel}</span>
												<button
													type="button"
													onClick={() => removeTraitFilter(filter.traitName)}
													className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
													aria-label={`Remove ${filter.traitName} filter`}
												>
													<X className="h-3 w-3" />
												</button>
											</div>
										);
									})}
								</div>
							)}

							{/* Characters Grid */}
							{isLoading ? (
								<CharactersSkeleton />
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
								<div className="flex min-h-[12rem] flex-col items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed p-8 text-center">
									<div className="mb-4 rounded-full bg-muted p-3">
										<Users className="h-6 w-6 text-muted-foreground" />
									</div>
									<h4 className="mb-1 font-semibold text-sm">
										{hasActiveFilters
											? "No matching characters"
											: "No characters yet"}
									</h4>
									<p className="mb-4 max-w-sm text-muted-foreground text-xs">
										{hasActiveFilters
											? "Try adjusting your filters."
											: "Create characters in one of your realms to get started."}
									</p>
									{hasActiveFilters && (
										<Button
											variant="outline"
											size="sm"
											onClick={clearAllFilters}
										>
											Clear filters
										</Button>
									)}
								</div>
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
