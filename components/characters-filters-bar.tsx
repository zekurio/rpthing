"use client";

import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface CharactersFiltersBarProps {
	localSearch: string;
	setLocalSearch: (value: string) => void;
	handleSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	updateUrlParam: (key: string, value: string | null) => void;
	creatorFilter: string | null;
	availableCreators: string[];
	availableGenders: string[];
	availableTraitNames: string[];
	traitFilters: Array<{
		traitName: string;
		min: number | null;
		max: number | null;
	}>;
	genderFilter: string | null;
	setTraitFilterOpen: (open: boolean) => void;
}

export function CharactersFiltersBar({
	localSearch,
	setLocalSearch,
	handleSearchKeyDown,
	updateUrlParam,
	creatorFilter,
	availableCreators,
	availableGenders,
	availableTraitNames,
	traitFilters,
	genderFilter,
	setTraitFilterOpen,
}: CharactersFiltersBarProps) {
	const showFilterButton =
		availableGenders.length > 0 || availableTraitNames.length > 0;
	const filterCount = traitFilters.length + (genderFilter ? 1 : 0);

	return (
		<div className="flex w-full justify-center">
			<div className="flex w-full max-w-xl flex-col gap-2">
				{/* Search row with filter button */}
				<div className="flex w-full items-center gap-2">
					<div className="relative flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							value={localSearch}
							onChange={(e) => setLocalSearch(e.target.value)}
							onKeyDown={handleSearchKeyDown}
							onBlur={() => updateUrlParam("search", localSearch || null)}
							placeholder="Search characters..."
							aria-label="Search characters"
							className="pl-9"
						/>
					</div>

					{/* Filter Button */}
					{showFilterButton && (
						<Button
							variant="outline"
							size="icon"
							className="relative shrink-0"
							aria-label="Filters"
							onClick={() => setTraitFilterOpen(true)}
						>
							<Filter className="h-4 w-4" />
							{filterCount > 0 && (
								<span className="-right-1.5 -top-1.5 absolute flex h-5 w-5 items-center justify-center rounded-full bg-primary font-medium text-[11px] text-primary-foreground">
									{filterCount}
								</span>
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
						<SelectTrigger className="w-full">
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
			</div>
		</div>
	);
}
