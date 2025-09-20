"use client";

import { Filter, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useRealmGenderOptions } from "@/hooks/use-realm-gender-options";
import { gradeForValue } from "@/lib/traits";
import type { Trait } from "@/types";

export interface FilterState {
	gender: string | null;
	creator: string | null;
	traitFilters: Record<
		string,
		{
			minScore: string | null;
			maxScore: string | null;
		}
	>;
}

interface FilterDropdownProps {
	realmId: string;
	filters: FilterState;
	onFiltersChange: (filters: FilterState) => void;
	availableCreators: string[];
	availableTraits: Trait[];
}

export function FilterDropdown({
	realmId,
	filters,
	onFiltersChange,
	availableCreators,
	availableTraits,
}: FilterDropdownProps) {
	const genderOptions = useRealmGenderOptions(realmId);
	const [isOpen, setIsOpen] = useState(false);
	const genderFilterId = useId();
	const creatorFilterId = useId();

	const hasActiveFilters = useMemo(() => {
		return (
			filters.gender !== null ||
			filters.creator !== null ||
			Object.keys(filters.traitFilters).length > 0
		);
	}, [filters]);

	const clearAllFilters = () => {
		onFiltersChange({
			gender: null,
			creator: null,
			traitFilters: {},
		});
	};

	const updateFilter = (key: keyof FilterState, value: string | null) => {
		const normalizedValue = value === "all" || value === "any" ? null : value;
		onFiltersChange({
			...filters,
			[key]: normalizedValue,
		});
	};

	const updateTraitFilter = (
		traitId: string,
		field: "minScore" | "maxScore",
		value: string | null,
	) => {
		const normalizedValue = value === "any" ? null : value;
		onFiltersChange({
			...filters,
			traitFilters: {
				...filters.traitFilters,
				[traitId]: {
					...filters.traitFilters[traitId],
					[field]: normalizedValue,
				},
			},
		});
	};

	const [newTraitName, setNewTraitName] = useState("");

	const traitIdToTrait = useMemo(() => {
		const map: Record<string, Trait> = {};
		availableTraits.forEach((t) => {
			map[t.id] = t;
		});
		return map;
	}, [availableTraits]);

	const availableAddTraitOptions = useMemo(() => {
		const selectedIds = new Set(Object.keys(filters.traitFilters));
		return availableTraits
			.filter((t) => !selectedIds.has(t.id))
			.map((t) => t.name);
	}, [availableTraits, filters.traitFilters]);

	const addTraitByName = (name: string) => {
		const trait = availableTraits.find((t) => t.name === name);
		if (!trait) return;
		if (filters.traitFilters[trait.id]) return;
		onFiltersChange({
			...filters,
			traitFilters: {
				...filters.traitFilters,
				[trait.id]: { minScore: null, maxScore: null },
			},
		});
	};

	const removeTraitFilter = (traitId: string) => {
		const { [traitId]: _omit, ...rest } = filters.traitFilters;
		onFiltersChange({ ...filters, traitFilters: rest });
	};

	const getScoreOptions = (_trait: Trait) => {
		const options = [];
		for (let score = 1; score <= 20; score++) {
			const grade = gradeForValue(score);
			options.push({
				value: score.toString(),
				label: `${score} (${grade})`,
				grade,
			});
		}
		return options;
	};

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					className="relative"
					aria-label="Filter options"
				>
					<Filter className="h-4 w-4" />
					{hasActiveFilters && (
						<div className="-right-1 -top-1 absolute h-2 w-2 rounded-full bg-primary" />
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-80 p-4" align="end">
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h4 className="font-semibold text-sm">Filters</h4>
						{hasActiveFilters && (
							<Button
								variant="ghost"
								size="sm"
								onClick={clearAllFilters}
								className="h-6 px-2 text-muted-foreground hover:text-foreground"
							>
								<X className="h-3 w-3" />
								Clear all
							</Button>
						)}
					</div>

					<Separator />

					{/* Gender Filter */}
					<div className="space-y-2">
						<Label htmlFor={genderFilterId} className="font-medium text-xs">
							Gender
						</Label>
						<Select
							value={filters.gender || "all"}
							onValueChange={(value) => updateFilter("gender", value)}
						>
							<SelectTrigger id={genderFilterId}>
								<SelectValue placeholder="All genders" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All genders</SelectItem>
								{genderOptions.map((gender) => (
									<SelectItem key={gender} value={gender}>
										{gender}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Trait Filters */}
					<div className="space-y-3">
						<Label className="font-medium text-xs">Add trait filter</Label>
						<Combobox
							options={availableAddTraitOptions}
							value={newTraitName}
							onValueChange={(value) => {
								setNewTraitName("");
								addTraitByName(value);
							}}
							placeholder="Search traits..."
							emptyText="No traits found"
							className="w-full"
						/>
						{Object.keys(filters.traitFilters).length > 0 && (
							<div className="max-h-60 space-y-2 overflow-y-auto">
								{Object.entries(filters.traitFilters).map(
									([traitId, traitFilter], index) => {
										const trait = traitIdToTrait[traitId];
										if (!trait) return null;
										const scoreOptions = getScoreOptions(trait);
										const minScoreId = `${trait.id}-min-${index}`;
										const maxScoreId = `${trait.id}-max-${index}`;
										return (
											<div
												key={traitId}
												className="space-y-2 rounded-lg border bg-muted/30 p-3"
											>
												<div className="flex items-center justify-between gap-2">
													<div className="flex items-center gap-2">
														<span className="font-medium text-xs">
															{trait.name}
														</span>
														<span className="text-muted-foreground text-xs capitalize">
															({trait.displayMode})
														</span>
													</div>
													<Button
														variant="ghost"
														size="sm"
														className="h-6 px-2 text-muted-foreground hover:text-foreground"
														onClick={() => removeTraitFilter(traitId)}
														aria-label="Remove trait filter"
													>
														<X className="h-3 w-3" />
													</Button>
												</div>
												<div className="grid grid-cols-2 gap-2">
													<div className="space-y-1">
														<Label
															htmlFor={minScoreId}
															className="text-muted-foreground text-xs"
														>
															Min
														</Label>
														<Select
															value={traitFilter.minScore || "any"}
															onValueChange={(value) =>
																updateTraitFilter(trait.id, "minScore", value)
															}
														>
															<SelectTrigger id={minScoreId} className="h-8">
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
														<Label
															htmlFor={maxScoreId}
															className="text-muted-foreground text-xs"
														>
															Max
														</Label>
														<Select
															value={traitFilter.maxScore || "any"}
															onValueChange={(value) =>
																updateTraitFilter(trait.id, "maxScore", value)
															}
														>
															<SelectTrigger id={maxScoreId} className="h-8">
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
									},
								)}
							</div>
						)}
					</div>

					{/* Creator Filter */}
					<div className="space-y-2">
						<Label htmlFor={creatorFilterId} className="font-medium text-xs">
							Creator
						</Label>
						<Select
							value={filters.creator || "all"}
							onValueChange={(value) => updateFilter("creator", value)}
						>
							<SelectTrigger id={creatorFilterId}>
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
					</div>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
