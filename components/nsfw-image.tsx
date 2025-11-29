"use client";

import { Eye, EyeOff } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { memo, useCallback, useEffect, useState } from "react";
import { useNsfw } from "@/hooks/use-nsfw";
import { cn } from "@/lib/utils";

interface NsfwImageProps extends Omit<ImageProps, "onLoad"> {
	/** Whether this image is NSFW (from server-side classification) */
	isNsfw?: boolean;
	/** Called when the image finishes loading */
	onLoad?: () => void;
}

export const NsfwImage = memo(function NsfwImage({
	src,
	alt,
	className,
	isNsfw = false,
	onLoad,
	...props
}: NsfwImageProps) {
	const { blurNsfw } = useNsfw();
	const [isRevealed, setIsRevealed] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);

	const srcString = typeof src === "string" ? src : "";

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

	// Only blur if the preference is enabled and the image is marked NSFW
	const shouldBlur = blurNsfw && isNsfw && !isRevealed;

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

			{/* NSFW overlay with reveal control */}
			{blurNsfw && isNsfw && imageLoaded && (
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
			{blurNsfw && isNsfw && isRevealed && imageLoaded && (
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
