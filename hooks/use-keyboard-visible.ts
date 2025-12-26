"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface KeyboardVisibilityState {
	isKeyboardVisible: boolean;
	keyboardHeight: number;
}

export function useKeyboardVisible(): KeyboardVisibilityState {
	const [state, setState] = useState<KeyboardVisibilityState>({
		isKeyboardVisible: false,
		keyboardHeight: 0,
	});

	// Track the "base" height when keyboard is not visible
	const baseHeightRef = useRef<number>(0);
	const isInitializedRef = useRef(false);

	const updateBaseHeight = useCallback(() => {
		if (typeof window !== "undefined") {
			// Use the larger of innerHeight and visualViewport height as base
			// This handles cases where browser chrome is hidden/shown
			const viewportHeight =
				window.visualViewport?.height ?? window.innerHeight;
			const newBase = Math.max(window.innerHeight, viewportHeight);
			if (newBase > baseHeightRef.current) {
				baseHeightRef.current = newBase;
			}
		}
	}, []);

	useEffect(() => {
		if (typeof window === "undefined" || !window.visualViewport) {
			return;
		}

		const visualViewport = window.visualViewport;

		// Initialize base height
		if (!isInitializedRef.current) {
			baseHeightRef.current = window.innerHeight;
			isInitializedRef.current = true;
		}

		const handleResize = () => {
			const viewportHeight = visualViewport.height;
			const viewportOffsetTop = visualViewport.offsetTop;

			// Calculate keyboard height using multiple signals
			// 1. Difference between base height and current viewport height
			// 2. The offsetTop indicates how much the viewport has scrolled
			const heightDiff = baseHeightRef.current - viewportHeight;
			const keyboardHeight = Math.max(0, heightDiff - viewportOffsetTop);

			// Use a smaller threshold (50px) to detect keyboard
			// This helps with smaller keyboards and accessory bars
			const isKeyboardVisible = keyboardHeight > 50;

			if (isKeyboardVisible) {
				setState({
					isKeyboardVisible: true,
					keyboardHeight: keyboardHeight + 16, // Add 16px padding
				});
			} else {
				// When keyboard closes, update base height in case it changed
				updateBaseHeight();
				setState({
					isKeyboardVisible: false,
					keyboardHeight: 0,
				});
			}
		};

		const handleScroll = () => {
			// Recalculate on scroll as viewport offset changes
			handleResize();
		};

		// Handle visual viewport changes (iOS Safari, modern browsers)
		visualViewport.addEventListener("resize", handleResize);
		visualViewport.addEventListener("scroll", handleScroll);

		// Handle orientation changes - reset base height
		const handleOrientationChange = () => {
			// Wait for orientation change to complete
			setTimeout(() => {
				baseHeightRef.current = window.innerHeight;
				handleResize();
			}, 100);
		};

		window.addEventListener("orientationchange", handleOrientationChange);

		// Initial check
		handleResize();

		return () => {
			visualViewport.removeEventListener("resize", handleResize);
			visualViewport.removeEventListener("scroll", handleScroll);
			window.removeEventListener("orientationchange", handleOrientationChange);
		};
	}, [updateBaseHeight]);

	return state;
}
