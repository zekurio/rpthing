"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
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

/**
 * Hook to position a fixed element above the virtual keyboard on mobile.
 * Uses the Visual Viewport API to track keyboard state and adjust positioning.
 * Only updates on resize (keyboard open/close), not on scroll.
 */
function useFloatingAboveKeyboard() {
	const [bottom, setBottom] = useState(16); // Default 1rem = 16px

	useEffect(() => {
		if (typeof window === "undefined" || !window.visualViewport) {
			return;
		}

		const vv = window.visualViewport;

		const updatePosition = () => {
			// When keyboard opens, visualViewport.height shrinks
			// The difference tells us how much space the keyboard takes
			const keyboardHeight = window.innerHeight - vv.height;

			// Only adjust if keyboard is actually open (significant height difference)
			if (keyboardHeight > 100) {
				setBottom(keyboardHeight + 16);
			} else {
				setBottom(16);
			}
		};

		// Initial position
		updatePosition();

		// Only listen to resize (keyboard open/close), not scroll
		vv.addEventListener("resize", updatePosition);
		window.addEventListener("orientationchange", updatePosition);

		return () => {
			vv.removeEventListener("resize", updatePosition);
			window.removeEventListener("orientationchange", updatePosition);
		};
	}, []);

	return bottom;
}

export function CharactersFloatingMenu({
	localSearch,
	onSearchChange,
	onSearchKeyDown,
	activeFilterCount,
	onFilterClick,
	onCreateClick,
}: CharactersFloatingMenuProps) {
	const bottom = useFloatingAboveKeyboard();

	return (
		<div
			className="-translate-x-1/2 fixed left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 md:bottom-6 md:w-auto md:max-w-none"
			style={{ bottom: `${bottom}px` }}
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
