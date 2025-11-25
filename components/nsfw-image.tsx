"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { memo, useCallback, useEffect, useState } from "react";
import { useNsfw } from "@/hooks/use-nsfw";
import { cn } from "@/lib/utils";

interface NsfwImageProps extends Omit<ImageProps, "onLoad"> {
	/** If true, skip NSFW classification entirely */
	skipClassification?: boolean;
	/** Called when the image finishes loading */
	onLoad?: () => void;
	/** Alternative image URL to use for classification (e.g., full image instead of cropped) */
	classificationSrc?: string;
}

export const NsfwImage = memo(function NsfwImage({
	src,
	alt,
	className,
	skipClassification = false,
	onLoad,
	classificationSrc,
	...props
}: NsfwImageProps) {
	const { blurNsfw, classifyImage, getClassification, isModelLoading } =
		useNsfw();
	const [isNsfw, setIsNsfw] = useState<boolean | null>(null);
	const [isRevealed, setIsRevealed] = useState(false);
	const [isClassifying, setIsClassifying] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);

	const srcString = typeof src === "string" ? src : "";
	// Use classificationSrc if provided, otherwise fall back to display src
	const classifySrc = classificationSrc || srcString;

	// Check cache and classify if needed
	useEffect(() => {
		if (skipClassification || !blurNsfw || !classifySrc) {
			setIsNsfw(false);
			return;
		}

		// Check cache first
		const cached = getClassification(classifySrc);
		if (cached) {
			setIsNsfw(cached.isNsfw);
			return;
		}

		// Start classification
		setIsClassifying(true);
		classifyImage(classifySrc)
			.then((result) => {
				setIsNsfw(result);
			})
			.catch(() => {
				setIsNsfw(false);
			})
			.finally(() => {
				setIsClassifying(false);
			});
	}, [
		classifySrc,
		blurNsfw,
		skipClassification,
		classifyImage,
		getClassification,
	]);

	// Reset revealed state when src changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: srcString is intentionally used to reset state when image changes
	useEffect(() => {
		setIsRevealed(false);
		setImageLoaded(false);
	}, [srcString]);

	const handleImageLoad = useCallback(() => {
		setImageLoaded(true);
		onLoad?.();
	}, [onLoad]);

	const toggleReveal = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		setIsRevealed((prev) => !prev);
	}, []);

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.stopPropagation();
			e.preventDefault();
			setIsRevealed((prev) => !prev);
		}
	}, []);

	const isClassificationPending =
		blurNsfw && (isClassifying || isModelLoading) && isNsfw === null;
	const shouldBlur =
		blurNsfw && ((isNsfw === true && !isRevealed) || isClassificationPending);
	const showLoadingOverlay = isClassificationPending;

	return (
		<div className="relative h-full w-full">
			<Image
				src={src}
				alt={alt}
				className={cn(
					className,
					shouldBlur && "scale-105 blur-xl transition-all duration-300",
					!shouldBlur && "scale-100 blur-0 transition-all duration-300",
				)}
				onLoad={handleImageLoad}
				{...props}
			/>

			{/* Loading overlay while classifying */}
			{showLoadingOverlay && imageLoaded && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
					<div className="flex items-center gap-2 rounded-md bg-black/60 px-3 py-2 text-white text-xs">
						<Loader2 className="h-3 w-3 animate-spin" />
						<span>Checking...</span>
					</div>
				</div>
			)}

			{/* NSFW overlay with reveal control */}
			{blurNsfw && isNsfw === true && imageLoaded && (
				<div
					className={cn(
						"absolute inset-0 flex items-center justify-center transition-opacity duration-300",
						isRevealed ? "pointer-events-none opacity-0" : "opacity-100",
					)}
				>
					{/* biome-ignore lint/a11y/useSemanticElements: Cannot use button due to potential nesting inside parent button */}
					<div
						role="button"
						tabIndex={0}
						onClick={toggleReveal}
						onKeyDown={handleKeyDown}
						className="flex cursor-pointer items-center gap-2 rounded-md bg-black/70 px-3 py-2 text-white text-xs transition-colors hover:bg-black/80"
						aria-label="Show NSFW image"
					>
						<Eye className="h-4 w-4" />
						<span>Show</span>
					</div>
				</div>
			)}

			{/* Hide control when revealed */}
			{blurNsfw && isNsfw === true && isRevealed && imageLoaded && (
				// biome-ignore lint/a11y/useSemanticElements: Cannot use button due to potential nesting inside parent button
				<div
					role="button"
					tabIndex={0}
					onClick={toggleReveal}
					onKeyDown={handleKeyDown}
					className="absolute top-2 left-2 flex cursor-pointer items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-white text-xs transition-colors hover:bg-black/80"
					aria-label="Hide NSFW image"
				>
					<EyeOff className="h-3 w-3" />
					<span>Hide</span>
				</div>
			)}
		</div>
	);
});
