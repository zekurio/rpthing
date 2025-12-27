"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

function isInputFocused(): boolean {
	const activeElement = document.activeElement;
	if (!activeElement) return false;
	const tagName = activeElement.tagName.toLowerCase();
	return (
		tagName === "input" ||
		tagName === "textarea" ||
		activeElement.getAttribute("contenteditable") === "true"
	);
}

/**
 * Hook to position a fixed element above the virtual keyboard on mobile.
 * Uses the Visual Viewport API combined with focus tracking to avoid
 * false positives from browser chrome (address bar) resizing.
 */
function useFloatingAboveKeyboard() {
	const [bottom, setBottom] = useState(16); // Default 1rem = 16px
	const isInputFocusedRef = useRef(false);

	useEffect(() => {
		// Also listen to scroll events since visualViewport fires on scroll too
		// when the keyboard is open (viewport moves relative to layout viewport)
		if (typeof window === "undefined" || !window.visualViewport) {
			return;
		}

		const vv = window.visualViewport;

		const updatePosition = () => {
			// Only adjust for keyboard if an input is focused
			if (!isInputFocusedRef.current) {
				setBottom(16);
				return;
			}

			// Calculate the distance from the bottom of the visual viewport to
			// the bottom of the layout viewport. This accounts for both the
			// keyboard height AND any scroll offset, keeping the element
			// positioned correctly relative to what the user actually sees.
			const visualBottom = vv.offsetTop + vv.height;
			const keyboardHeight = window.innerHeight - visualBottom;

			// Only treat as keyboard if significant height (>100px)
			// This filters out address bar changes
			if (keyboardHeight > 100) {
				setBottom(keyboardHeight + 16);
			} else {
				setBottom(16);
			}
		};

		const handleFocusIn = () => {
			if (isInputFocused()) {
				isInputFocusedRef.current = true;
				// Delay to let keyboard animation start
				setTimeout(updatePosition, 100);
			}
		};

		const handleFocusOut = (e: FocusEvent) => {
			const relatedTarget = e.relatedTarget as HTMLElement | null;
			const isMovingToInput =
				relatedTarget &&
				(relatedTarget.tagName.toLowerCase() === "input" ||
					relatedTarget.tagName.toLowerCase() === "textarea" ||
					relatedTarget.getAttribute("contenteditable") === "true");

			if (!isMovingToInput) {
				isInputFocusedRef.current = false;
				setBottom(16);
			}
		};

		// Initial state
		if (isInputFocused()) {
			isInputFocusedRef.current = true;
			updatePosition();
		}

		document.addEventListener("focusin", handleFocusIn);
		document.addEventListener("focusout", handleFocusOut);
		vv.addEventListener("resize", updatePosition);
		vv.addEventListener("scroll", updatePosition);
		window.addEventListener("orientationchange", updatePosition);

		return () => {
			document.removeEventListener("focusin", handleFocusIn);
			document.removeEventListener("focusout", handleFocusOut);
			vv.removeEventListener("resize", updatePosition);
			vv.removeEventListener("scroll", updatePosition);
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
