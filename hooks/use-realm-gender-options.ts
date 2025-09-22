import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { trpc } from "@/utils/trpc";

// Common fallback gender options if no realm-specific options exist
const FALLBACK_GENDER_OPTIONS = [
	"Male",
	"Female",
	"Non-binary",
	"Genderfluid",
	"Agender",
	"Other",
] as const;

export function useRealmGenderOptions(realmId: string) {
	const { data: characters } = useQuery({
		...trpc.character.list.queryOptions({ realmId }),
		enabled: !!realmId,
	});

	const genderOptions = useMemo(() => {
		if (!characters || characters.length === 0) {
			return FALLBACK_GENDER_OPTIONS;
		}

		// Extract unique, non-empty gender values from existing characters
		const uniqueGenders = new Set<string>();
		characters.forEach((character) => {
			if (character.gender?.trim()) {
				uniqueGenders.add(character.gender.trim());
			}
		});

		// Convert to array and sort alphabetically
		const realmGenders = Array.from(uniqueGenders).sort();

		// If we have realm-specific genders, use them as primary options
		// and add common options that aren't already present
		if (realmGenders.length > 0) {
			const additionalOptions = FALLBACK_GENDER_OPTIONS.filter(
				(option) =>
					!realmGenders.some(
						(gender) => gender.toLowerCase() === option.toLowerCase(),
					),
			);
			return [...realmGenders, ...additionalOptions];
		}

		// Fallback to common options if no realm-specific genders exist
		return FALLBACK_GENDER_OPTIONS;
	}, [characters]);

	return genderOptions;
}
