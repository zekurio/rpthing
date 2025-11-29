"use client";

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
	/** Min zoom level. Default 1. */
	minScale?: number;
}

export function ImageViewer({
	open,
	onOpenChange,
	src,
	alt,
	downloadHref,
	maxScale = 5,
	minScale: _minScale = 1,
}: ImageViewerProps) {
	const plugins = [Zoom];
	if (downloadHref) {
		plugins.push(Download);
	}

	return (
		<Lightbox
			open={open}
			close={() => onOpenChange(false)}
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
		/>
	);
}

export default ImageViewer;
