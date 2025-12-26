"use client";

import { useEffect, useRef, useState } from "react";

interface KeyboardVisibilityState {
	isKeyboardVisible: boolean;
	keyboardHeight: number;
}

function isInputFocused(): boolean {
	const activeElement = document.activeElement;
	if (!activeElement) return false;

	const tagName = activeElement.tagName.toLowerCase();
	if (tagName === "input" || tagName === "textarea") {
		return true;
	}

	// Check for contenteditable elements
	if (activeElement.getAttribute("contenteditable") === "true") {
		return true;
	}

	return false;
}

export function useKeyboardVisible(): KeyboardVisibilityState {
	const [state, setState] = useState<KeyboardVisibilityState>({
		isKeyboardVisible: false,
		keyboardHeight: 0,
	});

	// Track the "base" height when keyboard is not visible
	const baseHeightRef = useRef<number>(0);
	// Track if an input is currently focused
	const inputFocusedRef = useRef(false);

	useEffect(() => {
		if (typeof window === "undefined" || !window.visualViewport) {
			return;
		}

		const visualViewport = window.visualViewport;

		// Initialize base height
		baseHeightRef.current = window.innerHeight;

		const updateKeyboardState = () => {
			// Only consider keyboard visible if an input is focused
			if (!inputFocusedRef.current) {
				setState({
					isKeyboardVisible: false,
					keyboardHeight: 0,
				});
				return;
			}

			const viewportHeight = visualViewport.height;
			const heightDiff = baseHeightRef.current - viewportHeight;

			// Keyboard is visible if there's a significant height difference
			// and an input is focused
			const isKeyboardVisible = heightDiff > 100;

			if (isKeyboardVisible) {
				setState({
					isKeyboardVisible: true,
					keyboardHeight: heightDiff + 16, // Add padding
				});
			} else {
				setState({
					isKeyboardVisible: false,
					keyboardHeight: 0,
				});
			}
		};

		const handleFocusIn = () => {
			if (isInputFocused()) {
				inputFocusedRef.current = true;
				// Update base height before keyboard appears
				baseHeightRef.current = Math.max(
					baseHeightRef.current,
					window.innerHeight,
				);
				// Small delay to let keyboard animation start
				setTimeout(updateKeyboardState, 100);
			}
		};

		const handleFocusOut = (e: FocusEvent) => {
			// Check if focus is moving to another input
			const relatedTarget = e.relatedTarget as HTMLElement | null;
			const isMovingToInput =
				relatedTarget &&
				(relatedTarget.tagName.toLowerCase() === "input" ||
					relatedTarget.tagName.toLowerCase() === "textarea" ||
					relatedTarget.getAttribute("contenteditable") === "true");

			if (!isMovingToInput) {
				inputFocusedRef.current = false;
				// Small delay to let keyboard close
				setTimeout(updateKeyboardState, 100);
			}
		};

		const handleResize = () => {
			// Only respond to resize if input is focused (keyboard related)
			if (inputFocusedRef.current) {
				updateKeyboardState();
			} else {
				// Update base height when keyboard is not visible
				baseHeightRef.current = Math.max(
					baseHeightRef.current,
					visualViewport.height,
				);
			}
		};

		const handleOrientationChange = () => {
			setTimeout(() => {
				baseHeightRef.current = window.innerHeight;
				updateKeyboardState();
			}, 100);
		};

		// Listen for focus changes on the document
		document.addEventListener("focusin", handleFocusIn);
		document.addEventListener("focusout", handleFocusOut);

		// Listen for viewport resize (keyboard appearing/disappearing)
		visualViewport.addEventListener("resize", handleResize);

		// Handle orientation changes
		window.addEventListener("orientationchange", handleOrientationChange);

		// Check initial state
		if (isInputFocused()) {
			inputFocusedRef.current = true;
			updateKeyboardState();
		}

		return () => {
			document.removeEventListener("focusin", handleFocusIn);
			document.removeEventListener("focusout", handleFocusOut);
			visualViewport.removeEventListener("resize", handleResize);
			window.removeEventListener("orientationchange", handleOrientationChange);
		};
	}, []);

	return state;
}
