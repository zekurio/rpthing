"use client";

import { Suspense, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CharacterGallery } from "@/components/character-gallery";
import { CharactersEmptyState } from "@/components/characters-empty-state";
import { CharactersErrorState } from "@/components/characters-error-state";
import { CharactersFilterDialog } from "@/components/characters-filter-dialog";
import { CharactersFloatingMenu } from "@/components/characters-floating-menu";
import { CharactersLoadingState } from "@/components/characters-loading-state";
import { CharactersPageHeader } from "@/components/characters-page-header";
import { CreateCharacterDialog } from "@/components/create-character-dialog";
import { CreateOrJoinRealmDialog } from "@/components/create-or-join-realm-dialog";
import { LoadingSpinner } from "@/components/ui/loading";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useCharacterFilters } from "@/hooks/use-character-filters";
import { useCharactersData } from "@/hooks/use-characters-data";

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
	useAuth();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [createCharacterOpen, setCreateCharacterOpen] = useState(false);
	const [traitFilterOpen, setTraitFilterOpen] = useState(false);

	// Filter state management
	const filters = useCharacterFilters();

	// Data fetching and filtering
	const data = useCharactersData({
		realmFilter: filters.realmFilter,
		searchFilter: filters.searchFilter,
		localSearch: filters.localSearch,
		genderFilter: filters.genderFilter,
		creatorFilter: filters.creatorFilter,
		traitFilters: filters.traitFilters,
	});

	// Calculate active filter count for badge
	const activeFilterCount =
		filters.traitFilters.length +
		(filters.genderFilter ? 1 : 0) +
		(filters.creatorFilter ? 1 : 0);

	// Loading state
	if (data.realmsLoading) {
		return (
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<CharactersPageHeader filteredRealmName={data.filteredRealmName} />
					<div className="flex h-full min-h-0 w-full flex-col">
						<main className="flex-1 overflow-y-auto p-6 pt-20 md:pt-6">
							<CharactersLoadingState />
						</main>
					</div>
				</SidebarInset>
			</SidebarProvider>
		);
	}

	// Error state
	if (data.error) {
		return (
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<CharactersPageHeader filteredRealmName={data.filteredRealmName} />
					<div className="flex h-full min-h-0 w-full flex-col">
						<main className="flex-1 overflow-y-auto p-6 pt-20 md:pt-6">
							<CharactersErrorState />
						</main>
					</div>
				</SidebarInset>
			</SidebarProvider>
		);
	}

	// No realms state
	if (!data.realms || data.realms.length === 0) {
		return (
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<CharactersPageHeader filteredRealmName={data.filteredRealmName} />
					<div className="flex h-full min-h-0 w-full flex-col">
						<main className="flex-1 overflow-y-auto p-6 pt-20 md:pt-6">
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
			<SidebarInset className="overflow-hidden">
				<CharactersPageHeader filteredRealmName={data.filteredRealmName} />
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<main className="scrollbar-none flex-1 overflow-y-auto [scrollbar-gutter:stable]">
						<div className="space-y-6 p-6 pt-20 pb-24 md:pt-6">
							{/* Filter Dialog */}
							<CharactersFilterDialog
								open={traitFilterOpen}
								onOpenChange={setTraitFilterOpen}
								genderFilter={filters.genderFilter}
								creatorFilter={filters.creatorFilter}
								updateUrlParam={filters.updateUrlParam}
								availableGenders={data.availableGenders}
								availableCreators={data.availableCreators}
								availableTraitsToFilter={data.availableTraitsToFilter}
								traitFilters={filters.traitFilters}
								addTraitFilter={filters.addTraitFilter}
								getTraitDisplayMode={data.getTraitDisplayMode}
								updateTraitFilter={filters.updateTraitFilter}
								removeTraitFilter={filters.removeTraitFilter}
								clearAllFiltersInDialog={filters.clearAllFiltersInDialog}
							/>

							{/* Characters Grid */}
							{data.isLoading ? (
								<div className="flex h-64 items-center justify-center">
									<LoadingSpinner size="lg" />
								</div>
							) : data.filteredCharacters.length > 0 ||
								data.unratedCharacters.length > 0 ? (
								<div className="space-y-8">
									{/* Rated/Matched Characters */}
									{data.filteredCharacters.length > 0 && (
										<CharacterGallery
											items={data.filteredCharacters.map(
												(item) => item.character,
											)}
											onChanged={data.invalidateCharacters}
											realmId={filters.realmFilter ?? undefined}
										/>
									)}

									{/* Unrated Characters Section */}
									{data.unratedCharacters.length > 0 && (
										<div className="space-y-4">
											<div className="flex items-center gap-2">
												<h4 className="font-medium text-muted-foreground text-sm">
													Unrated for selected traits
												</h4>
												<span className="text-muted-foreground text-xs">
													({data.unratedCharacters.length} character
													{data.unratedCharacters.length === 1 ? "" : "s"})
												</span>
											</div>
											<CharacterGallery
												items={data.unratedCharacters.map(
													(item) => item.character,
												)}
												onChanged={data.invalidateCharacters}
												realmId={filters.realmFilter ?? undefined}
											/>
										</div>
									)}
								</div>
							) : (
								<CharactersEmptyState
									type="no-results"
									hasActiveFilters={filters.hasActiveFilters}
									onClearFilters={filters.clearAllFilters}
								/>
							)}
						</div>
					</main>
				</div>

				{/* Floating bottom menu */}
				<CharactersFloatingMenu
					localSearch={filters.localSearch}
					onSearchChange={filters.setLocalSearch}
					onSearchKeyDown={filters.handleSearchKeyDown}
					activeFilterCount={activeFilterCount}
					onFilterClick={() => setTraitFilterOpen(true)}
					onCreateClick={() => setCreateCharacterOpen(true)}
				/>

				{/* Create character dialog */}
				<CreateCharacterDialog
					open={createCharacterOpen}
					onOpenChange={setCreateCharacterOpen}
					realmId={filters.realmFilter ?? undefined}
					onCreated={data.invalidateCharacters}
				/>
			</SidebarInset>
		</SidebarProvider>
	);
}
