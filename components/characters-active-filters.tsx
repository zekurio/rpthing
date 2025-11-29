"use client";

import { X } from "lucide-react";
import { gradeForValue } from "@/lib/traits";

interface TraitFilter {
	traitName: string;
	min: number | null;
	max: number | null;
}

interface CharactersActiveFiltersProps {
	traitFilters: TraitFilter[];
	getTraitDisplayMode: (traitName: string) => "number" | "grade";
	removeTraitFilter: (traitName: string) => void;
}

export function CharactersActiveFilters({
	traitFilters,
	getTraitDisplayMode,
	removeTraitFilter,
}: CharactersActiveFiltersProps) {
	if (traitFilters.length === 0) {
		return null;
	}

	return (
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
				const isMaxHighest = filter.max === null || filter.max === 20;

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
	);
}
