"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
 */
function useFloatingAboveKeyboard() {
	const [styles, setStyles] = useState<React.CSSProperties>({
		position: "fixed",
		bottom: "1rem",
		left: "50%",
		transform: "translateX(-50%)",
	});

	const updatePosition = useCallback(() => {
		const vv = window.visualViewport;
		if (!vv) {
			return;
		}

		// Calculate the bottom position relative to the visual viewport
		// When keyboard is open, visualViewport.height < window.innerHeight
		// and visualViewport.offsetTop indicates how much the viewport has scrolled
		const bottomOffset = window.innerHeight - vv.height - vv.offsetTop;

		// Add padding above keyboard (16px) or default bottom spacing
		const bottom = Math.max(bottomOffset + 16, 16);

		setStyles({
			position: "fixed",
			bottom: `${bottom}px`,
			left: "50%",
			transform: "translateX(-50%)",
		});
	}, []);

	useEffect(() => {
		if (typeof window === "undefined" || !window.visualViewport) {
			return;
		}

		const vv = window.visualViewport;

		// Initial position
		updatePosition();

		// Update on viewport changes (keyboard show/hide, scroll while keyboard open)
		vv.addEventListener("resize", updatePosition);
		vv.addEventListener("scroll", updatePosition);

		// Also handle orientation changes
		window.addEventListener("orientationchange", updatePosition);

		return () => {
			vv.removeEventListener("resize", updatePosition);
			vv.removeEventListener("scroll", updatePosition);
			window.removeEventListener("orientationchange", updatePosition);
		};
	}, [updatePosition]);

	return styles;
}

export function CharactersFloatingMenu({
	localSearch,
	onSearchChange,
	onSearchKeyDown,
	activeFilterCount,
	onFilterClick,
	onCreateClick,
}: CharactersFloatingMenuProps) {
	const floatingStyles = useFloatingAboveKeyboard();

	return (
		<div
			className="z-50 flex w-[calc(100%-2rem)] max-w-md items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 shadow-lg backdrop-blur transition-[bottom] duration-150 ease-out supports-[backdrop-filter]:bg-background/80 md:w-auto md:max-w-none"
			style={floatingStyles}
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
