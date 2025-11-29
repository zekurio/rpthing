"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CharactersClearFiltersButtonProps {
	hasActiveFilters: boolean;
	onClearFilters: () => void;
}

export function CharactersClearFiltersButton({
	hasActiveFilters,
	onClearFilters,
}: CharactersClearFiltersButtonProps) {
	if (!hasActiveFilters) {
		return null;
	}

	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={onClearFilters}
			className="h-9 px-2 text-muted-foreground hover:text-foreground"
		>
			<X className="mr-1 h-4 w-4" />
			Clear filters
		</Button>
	);
}
