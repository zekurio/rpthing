"use client";

import { useCallback, useEffect, useRef } from "react";
import Lightbox from "yet-another-react-lightbox";
import Download from "yet-another-react-lightbox/plugins/download";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

interface ImageViewerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	src: string;
	alt: string;
	/** If provided, shows a download button linking to this href. */
	downloadHref?: string;
	/** Max zoom level. Default 5. */
	maxScale?: number;
}

export function ImageViewer({
	open,
	onOpenChange,
	src,
	alt,
	downloadHref,
	maxScale = 5,
}: ImageViewerProps) {
	const plugins = [Zoom];
	if (downloadHref) {
		plugins.push(Download);
	}

	// Ref to store scroll position
	const scrollPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	// Store scroll position when lightbox opens
	useEffect(() => {
		if (open) {
			const scrollContainer = document.querySelector(".overflow-y-auto");
			if (scrollContainer) {
				scrollPositionRef.current = {
					x: scrollContainer.scrollLeft,
					y: scrollContainer.scrollTop,
				};
			} else {
				// Fallback to window scroll
				scrollPositionRef.current = {
					x: window.scrollX,
					y: window.scrollY,
				};
			}
		}
	}, [open]);

	// Restore scroll position when lightbox closes
	useEffect(() => {
		if (!open) {
			const scrollContainer = document.querySelector(".overflow-y-auto");
			if (scrollContainer) {
				scrollContainer.scrollTo({
					left: scrollPositionRef.current.x,
					top: scrollPositionRef.current.y,
					behavior: "instant" as ScrollBehavior,
				});
			} else {
				// Fallback to window scroll
				window.scrollTo({
					left: scrollPositionRef.current.x,
					top: scrollPositionRef.current.y,
					behavior: "instant" as ScrollBehavior,
				});
			}
		}
	}, [open]);

	const handleClose = useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);

	return (
		<Lightbox
			open={open}
			close={handleClose}
			slides={[
				{
					src,
					alt,
					download: downloadHref ? downloadHref : undefined,
				},
			]}
			plugins={plugins}
			zoom={{
				maxZoomPixelRatio: maxScale,
				zoomInMultiplier: 1.2,
				doubleTapDelay: 300,
				doubleClickDelay: 300,
				doubleClickMaxStops: 2,
				keyboardMoveDistance: 50,
				wheelZoomDistanceFactor: 100,
				pinchZoomDistanceFactor: 100,
				scrollToZoom: true,
			}}
			carousel={{
				finite: true,
			}}
			render={{
				buttonPrev: () => null,
				buttonNext: () => null,
			}}
			controller={{
				closeOnBackdropClick: true,
				closeOnPullDown: true,
				closeOnPullUp: true,
			}}
			animation={{
				zoom: 300,
			}}
			styles={{
				container: {
					backgroundColor: "rgba(0, 0, 0, 0.9)",
				},
			}}
			// Disable the built-in noScroll to handle it manually
			noScroll={{ disabled: true }}
		/>
	);
}

export default ImageViewer;
