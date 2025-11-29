"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

const STORAGE_KEY = "nsfw-blur-preference";

interface NsfwContextValue {
	/** Whether to blur NSFW images */
	blurNsfw: boolean;
	/** Set the blur preference */
	setBlurNsfw: (value: boolean) => void;
}

const NsfwContext = createContext<NsfwContextValue | null>(null);

export function NsfwProvider({ children }: { children: ReactNode }) {
	const [blurNsfw, setBlurNsfwState] = useState(true);

	// Load preference from localStorage on mount
	useEffect(() => {
		if (typeof window === "undefined") return;

		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored !== null) {
			setBlurNsfwState(stored === "true");
		}
	}, []);

	// Persist preference to localStorage
	const setBlurNsfw = useCallback((value: boolean) => {
		setBlurNsfwState(value);
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY, String(value));
		}
	}, []);

	const value = useMemo(
		(): NsfwContextValue => ({
			blurNsfw,
			setBlurNsfw,
		}),
		[blurNsfw, setBlurNsfw],
	);

	return <NsfwContext.Provider value={value}>{children}</NsfwContext.Provider>;
}

export function useNsfw(): NsfwContextValue {
	const context = useContext(NsfwContext);
	if (!context) {
		throw new Error("useNsfw must be used within a NsfwProvider");
	}
	return context;
}
