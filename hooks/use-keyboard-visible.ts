"use client";

import { useEffect, useState } from "react";

interface KeyboardVisibilityState {
	isKeyboardVisible: boolean;
	keyboardHeight: number;
}

export function useKeyboardVisible(): KeyboardVisibilityState {
	const [state, setState] = useState<KeyboardVisibilityState>({
		isKeyboardVisible: false,
		keyboardHeight: 0,
	});

	useEffect(() => {
		if (typeof window === "undefined" || !window.visualViewport) {
			return;
		}

		const visualViewport = window.visualViewport;
		const initialHeight = window.innerHeight;

		const handleResize = () => {
			const currentHeight = visualViewport.height;
			const keyboardHeight = Math.max(0, initialHeight - currentHeight - 100); // 100px threshold
			const isKeyboardVisible = keyboardHeight > 0;

			setState({
				isKeyboardVisible,
				keyboardHeight: isKeyboardVisible ? keyboardHeight + 20 : 0, // Add 20px padding
			});
		};

		// Handle visual viewport changes (iOS Safari)
		visualViewport.addEventListener("resize", handleResize);
		// Handle window resize (Android/other browsers)
		window.addEventListener("resize", handleResize);

		// Initial check
		handleResize();

		return () => {
			visualViewport.removeEventListener("resize", handleResize);
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	return state;
}
