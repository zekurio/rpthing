"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef } from "react";
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
 * Uses direct DOM manipulation to avoid React re-renders during scroll,
 * which eliminates twitching/jitter on mobile devices.
 */
function useFloatingAboveKeyboard(ref: React.RefObject<HTMLDivElement | null>) {
	const isInputFocusedRef = useRef(false);
	const lastBottomRef = useRef(16);

	useEffect(() => {
		if (typeof window === "undefined" || !window.visualViewport) {
			return;
		}

		const vv = window.visualViewport;

		const updatePosition = () => {
			if (!ref.current) return;

			let newBottom = 16;

			// Only adjust for keyboard if an input is focused
			if (isInputFocusedRef.current) {
				// Calculate the distance from the bottom of the visual viewport to
				// the bottom of the layout viewport. This accounts for both the
				// keyboard height AND any scroll offset.
				const visualBottom = vv.offsetTop + vv.height;
				const keyboardHeight = window.innerHeight - visualBottom;

				// Only treat as keyboard if significant height (>100px)
				// This filters out address bar changes
				if (keyboardHeight > 100) {
					newBottom = keyboardHeight + 16;
				}
			}

			// Only update DOM if value changed to minimize reflows
			if (newBottom !== lastBottomRef.current) {
				lastBottomRef.current = newBottom;
				ref.current.style.bottom = `${newBottom}px`;
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
				updatePosition();
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
	}, [ref]);
}

export function CharactersFloatingMenu({
	localSearch,
	onSearchChange,
	onSearchKeyDown,
	activeFilterCount,
	onFilterClick,
	onCreateClick,
}: CharactersFloatingMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	useFloatingAboveKeyboard(menuRef);

	return (
		<div
			ref={menuRef}
			className="-translate-x-1/2 fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 md:bottom-6 md:w-auto md:max-w-none"
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
