"use client";

import { Plus } from "lucide-react";
import { CharactersSearchFilterBar } from "@/components/characters-search-filter-bar";
import { Button } from "@/components/ui/button";
import { useKeyboardVisible } from "@/hooks/use-keyboard-visible";

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
	const { isKeyboardVisible, keyboardHeight } = useKeyboardVisible();

	return (
		<div
			className="-translate-x-1/2 fixed left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 shadow-lg backdrop-blur transition-all duration-300 ease-in-out supports-[backdrop-filter]:bg-background/80 md:bottom-6 md:w-auto md:max-w-none"
			style={{
				bottom: isKeyboardVisible ? `${keyboardHeight}px` : "1rem", // 1rem = bottom-4
			}}
		>
			<CharactersSearchFilterBar
				localSearch={localSearch}
				onSearchChange={onSearchChange}
				onSearchKeyDown={onSearchKeyDown}
				activeFilterCount={activeFilterCount}
				onFilterClick={onFilterClick}
			/>
			<Button
				size="icon"
				className="h-10 w-10 shrink-0 bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
				onClick={onCreateClick}
				aria-label="Create character"
			>
				<Plus className="h-4 w-4" />
			</Button>
		</div>
	);
}
