"use client";

import { Eye } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { memo, useCallback, useEffect, useState } from "react";
import { useNsfw } from "@/hooks/use-nsfw";
import { cn } from "@/lib/utils";

interface NsfwImageProps extends Omit<ImageProps, "onLoad"> {
	/** Whether this image is NSFW (from server-side classification) */
	isNsfw?: boolean;
	/** Called when the image finishes loading */
	onLoad?: () => void;
	/** Called when the blur state changes (true = blurred, false = revealed) */
	onBlurStateChange?: (isBlurred: boolean) => void;
	/** Called to request hiding (re-blurring) the image from external control */
	onHide?: () => void;
	/** External control to force the image to be hidden/revealed */
	forceHidden?: boolean;
}

export const NsfwImage = memo(function NsfwImage({
	src,
	alt,
	className,
	isNsfw = false,
	onLoad,
	onBlurStateChange,
	forceHidden,
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

	// Handle external force hidden control
	useEffect(() => {
		if (forceHidden === true) {
			setIsRevealed(false);
		}
	}, [forceHidden]);

	// Notify parent when blur state changes
	useEffect(() => {
		const isBlurred = blurNsfw && isNsfw && !isRevealed;
		onBlurStateChange?.(isBlurred);
	}, [blurNsfw, isNsfw, isRevealed, onBlurStateChange]);

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
					"transform-gpu transition-[filter] duration-200 ease-in-out will-change-[filter]",
					className,
					shouldBlur ? "blur-xl" : "blur-0",
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
						className="flex cursor-pointer items-center gap-2 rounded-lg bg-black/70 px-4 py-3 text-sm text-white transition-colors hover:bg-black/80"
						aria-label="Show NSFW image"
					>
						<Eye className="h-5 w-5" />
						<span>Show</span>
					</div>
				</div>
			)}
		</div>
	);
});
