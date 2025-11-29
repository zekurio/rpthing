import { gradeForValue } from "@/lib/traits";

// Comparison types for trait filters
export type TraitComparison = "gte" | "lte" | "eq" | "between";

// Type for parsed trait filters (now uses trait name for cross-realm filtering)
export interface TraitFilter {
	traitName: string;
	comparison: TraitComparison;
	value: number | null;
	min: number | null;
	max: number | null;
}

// Convert trait name to URL-friendly slug (spaces to dashes, lowercase)
export function traitNameToSlug(traitName: string): string {
	return traitName.toLowerCase().replace(/\s+/g, "-");
}

// Convert URL slug back to trait name (dashes to spaces, title case)
export function slugToTraitName(slug: string): string {
	return slug
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

// Parse trait filters from URL search params
// Supports formats:
// - trait.charisma=gte.10 (greater than or equal)
// - trait.charisma=lte.10 (less than or equal)
// - trait.charisma=eq.10 (exactly)
// - trait.charisma=10-15 (between, legacy format also supported)
export function parseTraitFilters(
	searchParams: URLSearchParams | null,
): TraitFilter[] {
	if (!searchParams) return [];
	const filters: TraitFilter[] = [];

	searchParams.forEach((value, key) => {
		if (key.startsWith("trait.")) {
			const slug = key.slice(6); // Remove "trait." prefix
			const traitName = slugToTraitName(slug);

			let comparison: TraitComparison;
			let filterValue: number | null = null;
			let min: number | null = null;
			let max: number | null = null;

			if (value.startsWith("gte.")) {
				comparison = "gte";
				filterValue = Number.parseInt(value.slice(4), 10);
				min = filterValue;
				max = null;
			} else if (value.startsWith("lte.")) {
				comparison = "lte";
				filterValue = Number.parseInt(value.slice(4), 10);
				min = null;
				max = filterValue;
			} else if (value.startsWith("eq.")) {
				comparison = "eq";
				filterValue = Number.parseInt(value.slice(3), 10);
				min = filterValue;
				max = filterValue;
			} else if (value.includes("-")) {
				// Between format: 5-15
				comparison = "between";
				const [minStr, maxStr] = value.split("-");
				min = minStr ? Number.parseInt(minStr, 10) : null;
				max = maxStr ? Number.parseInt(maxStr, 10) : null;
			} else {
				// Single value, treat as exact match
				comparison = "eq";
				filterValue = Number.parseInt(value, 10);
				min = filterValue;
				max = filterValue;
			}

			// Validate parsed values
			if (filterValue !== null && Number.isNaN(filterValue)) filterValue = null;
			if (min !== null && Number.isNaN(min)) min = null;
			if (max !== null && Number.isNaN(max)) max = null;

			if (traitName && (filterValue !== null || min !== null || max !== null)) {
				filters.push({
					traitName,
					comparison,
					value: filterValue,
					min,
					max,
				});
			}
		}
	});

	return filters;
}

// Serialize a trait filter to URL param value
export function serializeTraitFilter(filter: TraitFilter): string {
	switch (filter.comparison) {
		case "gte":
			return `gte.${filter.value ?? filter.min ?? 1}`;
		case "lte":
			return `lte.${filter.value ?? filter.max ?? 20}`;
		case "eq":
			return `eq.${filter.value ?? filter.min ?? 10}`;
		case "between":
			return `${filter.min ?? ""}-${filter.max ?? ""}`;
		default:
			return "1-20";
	}
}

// Get human-readable label for comparison type
export function getComparisonLabel(comparison: TraitComparison): string {
	switch (comparison) {
		case "gte":
			return "At least";
		case "lte":
			return "At most";
		case "eq":
			return "Exactly";
		case "between":
			return "Between";
	}
}

// Generate score options for select dropdowns
export function getScoreOptions() {
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
