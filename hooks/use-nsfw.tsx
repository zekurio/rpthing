"use client";

import type * as nsfwjs from "nsfwjs";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

const STORAGE_KEY = "nsfw-blur-preference";
const CACHE_KEY = "nsfw-classification-cache";

const NSFW_CLASSES = ["Porn", "Hentai", "Sexy"];

type ClassificationResult = {
	isNsfw: boolean;
	confidence: number;
	timestamp: number;
};

type ClassificationCache = Record<string, ClassificationResult>;

interface NsfwContextValue {
	blurNsfw: boolean;
	setBlurNsfw: (value: boolean) => void;
	isModelLoading: boolean;
	isModelLoaded: boolean;
	classifyImage: (src: string) => Promise<boolean>;
	getClassification: (src: string) => ClassificationResult | null;
	preloadModel: () => Promise<void>;
}

const NsfwContext = createContext<NsfwContextValue | null>(null);

export function NsfwProvider({ children }: { children: ReactNode }) {
	const [blurNsfw, setBlurNsfwState] = useState(true);
	const [isModelLoading, setIsModelLoading] = useState(false);
	const [isModelLoaded, setIsModelLoaded] = useState(false);
	const [cache, setCache] = useState<ClassificationCache>({});

	const modelRef = useRef<nsfwjs.NSFWJS | null>(null);
	const modelPromiseRef = useRef<Promise<nsfwjs.NSFWJS> | null>(null);
	const pendingClassifications = useRef<Map<string, Promise<boolean>>>(
		new Map(),
	);

	// Load preference from localStorage on mount
	useEffect(() => {
		if (typeof window === "undefined") return;

		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored !== null) {
			setBlurNsfwState(stored === "true");
		}

		// Load cached classifications
		const cachedData = localStorage.getItem(CACHE_KEY);
		if (cachedData) {
			try {
				const parsed = JSON.parse(cachedData) as ClassificationCache;
				// Filter out entries older than 7 days
				const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
				const filtered: ClassificationCache = {};
				for (const [key, value] of Object.entries(parsed)) {
					if (value.timestamp > weekAgo) {
						filtered[key] = value;
					}
				}
				setCache(filtered);
			} catch {
				// Ignore parsing errors
			}
		}
	}, []);

	// Persist preference to localStorage
	const setBlurNsfw = useCallback((value: boolean) => {
		setBlurNsfwState(value);
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY, String(value));
		}
	}, []);

	// Persist cache to localStorage when it changes
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (Object.keys(cache).length === 0) return;

		localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
	}, [cache]);

	const loadModel = useCallback(async (): Promise<nsfwjs.NSFWJS> => {
		if (modelRef.current) {
			return modelRef.current;
		}

		if (modelPromiseRef.current) {
			return modelPromiseRef.current;
		}

		setIsModelLoading(true);

		modelPromiseRef.current = (async () => {
			const nsfwModule = await import("nsfwjs");
			// Use the default model which has proper CORS headers
			const model = await nsfwModule.load();
			modelRef.current = model;
			setIsModelLoaded(true);
			setIsModelLoading(false);
			return model;
		})();

		return modelPromiseRef.current;
	}, []);

	const preloadModel = useCallback(async () => {
		await loadModel();
	}, [loadModel]);

	const classifyImage = useCallback(
		async (src: string): Promise<boolean> => {
			// Check cache first
			const cached = cache[src];
			if (cached) {
				return cached.isNsfw;
			}

			// Check if there's already a pending classification for this image
			const pending = pendingClassifications.current.get(src);
			if (pending) {
				return pending;
			}

			const classificationPromise = (async () => {
				try {
					const model = await loadModel();

					// Create an image element for classification
					// Use proxy to avoid CORS issues with S3
					const img = new Image();
					img.crossOrigin = "anonymous";

					const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(src)}`;

					await new Promise<void>((resolve, reject) => {
						img.onload = () => resolve();
						img.onerror = () => reject(new Error("Failed to load image"));
						img.src = proxyUrl;
					});

					const predictions = await model.classify(img);

					// Find the top prediction (highest probability)
					const topPrediction = predictions.reduce((max, pred) =>
						pred.probability > max.probability ? pred : max,
					);

					// Only blur if the top prediction is an NSFW class
					const isNsfw = NSFW_CLASSES.includes(topPrediction.className);
					const confidence = topPrediction.probability;

					// Update cache
					setCache((prev) => ({
						...prev,
						[src]: {
							isNsfw,
							confidence,
							timestamp: Date.now(),
						},
					}));

					return isNsfw;
				} catch (error) {
					console.error("NSFW classification failed:", error);
					// Default to not NSFW on error
					return false;
				} finally {
					pendingClassifications.current.delete(src);
				}
			})();

			pendingClassifications.current.set(src, classificationPromise);
			return classificationPromise;
		},
		[cache, loadModel],
	);

	const getClassification = useCallback(
		(src: string): ClassificationResult | null => {
			return cache[src] || null;
		},
		[cache],
	);

	const value = useMemo(
		(): NsfwContextValue => ({
			blurNsfw,
			setBlurNsfw,
			isModelLoading,
			isModelLoaded,
			classifyImage,
			getClassification,
			preloadModel,
		}),
		[
			blurNsfw,
			setBlurNsfw,
			isModelLoading,
			isModelLoaded,
			classifyImage,
			getClassification,
			preloadModel,
		],
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
