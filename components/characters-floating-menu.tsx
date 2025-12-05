"use client";

import { Plus } from "lucide-react";
import { CharactersSearchFilterBar } from "@/components/characters-search-filter-bar";
import { Button } from "@/components/ui/button";

interface CharactersFloatingMenuProps {
	localSearch: string;
	onSearchChange: (value: string) => void;
	onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	activeFilterCount: number;
	onFilterClick: () => void;
	onCreateClick: () => void;
}

export function CharactersFloatingMenu({
	localSearch,
	onSearchChange,
	onSearchKeyDown,
	activeFilterCount,
	onFilterClick,
	onCreateClick,
}: CharactersFloatingMenuProps) {
	return (
		<div className="-translate-x-1/2 fixed bottom-6 left-1/2 z-50 flex items-center gap-2 rounded-sm border border-border bg-background/60 px-3 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<CharactersSearchFilterBar
				localSearch={localSearch}
				onSearchChange={onSearchChange}
				onSearchKeyDown={onSearchKeyDown}
				activeFilterCount={activeFilterCount}
				onFilterClick={onFilterClick}
			/>
			<Button
				size="icon"
				className="h-9 w-9 shrink-0"
				onClick={onCreateClick}
				aria-label="Create character"
			>
				<Plus className="h-4 w-4" />
			</Button>
		</div>
	);
}
