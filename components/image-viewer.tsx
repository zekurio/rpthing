"use client";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Download, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
// Removed next/image
import { useCallback, useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

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
	minScale = 1,
}: ImageViewerProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const contentRef = useRef<HTMLDivElement | null>(null);
	const imgRef = useRef<HTMLImageElement | null>(null);

	// Interaction state held in refs to avoid React re-renders during gestures
	const scaleRef = useRef<number>(1);
	const offsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const isPanningRef = useRef<boolean>(false);
	const rafRef = useRef<number | null>(null);

	// Multi-pointer state for pinch zoom
	const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
	const initialPinchDistRef = useRef<number | null>(null);
	const initialPinchCenterRef = useRef<{ x: number; y: number } | null>(null);
	const initialPinchScaleRef = useRef<number>(1);

	const clamp = useCallback(
		(v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
		[],
	);

	const applyTransform = useCallback(() => {
		if (!contentRef.current) return;
		const { x, y } = offsetRef.current;
		const s = scaleRef.current;
		contentRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
	}, []);

	const scheduleApply = useCallback(() => {
		if (rafRef.current !== null) return;
		rafRef.current = window.requestAnimationFrame(() => {
			rafRef.current = null;
			applyTransform();
		});
	}, [applyTransform]);

	const resetView = useCallback(() => {
		scaleRef.current = 1;
		offsetRef.current = { x: 0, y: 0 };
		scheduleApply();
	}, [scheduleApply]);

	useEffect(() => {
		if (!open) return;
		resetView();
		return () => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
			pointersRef.current.clear();
			initialPinchDistRef.current = null;
			initialPinchCenterRef.current = null;
		};
	}, [open, resetView]);

	const zoomTo = useCallback(
		(nextScale: number, anchor: { x: number; y: number }) => {
			const container = containerRef.current;
			if (!container) return;
			const _rect = container.getBoundingClientRect();
			const clamped = clamp(nextScale, minScale, maxScale);

			const cx = anchor.x;
			const cy = anchor.y;
			const dx = cx - offsetRef.current.x;
			const dy = cy - offsetRef.current.y;
			const ratio = clamped / scaleRef.current;
			offsetRef.current =
				clamped === 1
					? { x: 0, y: 0 }
					: { x: cx - dx * ratio, y: cy - dy * ratio };
			scaleRef.current = clamped;
			scheduleApply();
		},
		[clamp, minScale, maxScale, scheduleApply],
	);

	const zoomStep = useCallback(
		(factor: number) => {
			const el = containerRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const center = { x: rect.width / 2, y: rect.height / 2 };
			zoomTo(scaleRef.current * factor, center);
		},
		[zoomTo],
	);

	const handleWheel = useCallback(
		(e: React.WheelEvent<HTMLDivElement>) => {
			// Use wheel for zooming, prevent default to avoid page scroll while over viewer
			e.preventDefault();
			const container = containerRef.current;
			if (!container) return;
			const rect = container.getBoundingClientRect();
			const cx = e.clientX - rect.left;
			const cy = e.clientY - rect.top;
			const delta = -e.deltaY; // natural: wheel up zooms in
			const intensity = 0.0015;
			const next = scaleRef.current * (1 + delta * intensity);
			zoomTo(next, { x: cx, y: cy });
		},
		[zoomTo],
	);

	const onDoubleClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			const container = containerRef.current;
			if (!container) return;
			const rect = container.getBoundingClientRect();
			const cx = e.clientX - rect.left;
			const cy = e.clientY - rect.top;
			const target = scaleRef.current < 2 ? 2 : 1;
			zoomTo(target, { x: cx, y: cy });
		},
		[zoomTo],
	);

	// Pointer events for pan and pinch
	const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		// Ignore toolbar/controls so clicks like Close work normally
		const target = e.target as Element | null;
		if (target?.closest("[data-no-pan]")) {
			return;
		}
		const el = e.currentTarget as HTMLDivElement;
		el.setPointerCapture?.(e.pointerId);
		pointersRef.current.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
		});
		if (pointersRef.current.size === 1) {
			isPanningRef.current = true;
		}
		if (pointersRef.current.size === 2) {
			// Initialize pinch
			const pts = Array.from(pointersRef.current.values());
			const dx = pts[0].x - pts[1].x;
			const dy = pts[0].y - pts[1].y;
			initialPinchDistRef.current = Math.hypot(dx, dy);
			initialPinchScaleRef.current = scaleRef.current;
			initialPinchCenterRef.current = {
				x: (pts[0].x + pts[1].x) / 2 - el.getBoundingClientRect().left,
				y: (pts[0].y + pts[1].y) / 2 - el.getBoundingClientRect().top,
			};
			isPanningRef.current = false; // pinch takes precedence
		}
	}, []);

	const onPointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!pointersRef.current.has(e.pointerId)) return;
			const prev = pointersRef.current.get(e.pointerId);
			if (!prev) return;
			// Update to current position for subsequent computations
			pointersRef.current.set(e.pointerId, {
				x: e.clientX,
				y: e.clientY,
			});

			if (
				pointersRef.current.size === 2 &&
				initialPinchDistRef.current &&
				initialPinchCenterRef.current
			) {
				const pts = Array.from(pointersRef.current.values());
				const dx = pts[0].x - pts[1].x;
				const dy = pts[0].y - pts[1].y;
				const dist = Math.hypot(dx, dy);
				const ratio = dist / initialPinchDistRef.current;
				const targetScale = clamp(
					initialPinchScaleRef.current * ratio,
					minScale,
					maxScale,
				);
				zoomTo(targetScale, initialPinchCenterRef.current);
				return;
			}
			if (isPanningRef.current && pointersRef.current.size === 1) {
				const dx = e.clientX - prev.x;
				const dy = e.clientY - prev.y;
				offsetRef.current = {
					x: offsetRef.current.x + dx,
					y: offsetRef.current.y + dy,
				};
				scheduleApply();
			}
		},
		[clamp, minScale, maxScale, scheduleApply, zoomTo],
	);

	const onPointerUpOrCancel = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			pointersRef.current.delete(e.pointerId);
			if (pointersRef.current.size < 2) {
				initialPinchDistRef.current = null;
				initialPinchCenterRef.current = null;
			}
			if (pointersRef.current.size === 0) {
				isPanningRef.current = false;
			}
		},
		[],
	);

	const Toolbar = useMemo(
		() => (
			<div
				className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-background/80 p-1 shadow"
				data-no-pan
			>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => zoomStep(1 / 1.2)}
					aria-label="Zoom out"
				>
					<ZoomOut className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={resetView}
					aria-label="Reset view"
				>
					<RotateCcw className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => zoomStep(1.2)}
					aria-label="Zoom in"
				>
					<ZoomIn className="h-4 w-4" />
				</Button>
				{downloadHref ? (
					<a
						href={downloadHref}
						download
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Download image"
						data-no-pan
					>
						<Button asChild variant="ghost" size="icon">
							<span>
								<Download className="h-4 w-4" />
							</span>
						</Button>
					</a>
				) : null}
				<DialogClose asChild>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Close viewer"
						data-no-pan
					>
						<X className="h-4 w-4" />
					</Button>
				</DialogClose>
			</div>
		),
		[downloadHref, resetView, zoomStep],
	);

	const _onSingleClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			// Ignore toolbar clicks
			const target = e.target as Element | null;
			if (target?.closest("[data-no-pan]")) return;

			// Only close when not zoomed or panned
			if (scaleRef.current !== 1) return;
			if (offsetRef.current.x !== 0 || offsetRef.current.y !== 0) return;

			const container = containerRef.current;
			const img = imgRef.current;
			if (!container || !img) return;

			const rect = container.getBoundingClientRect();
			const naturalW = img.naturalWidth || 0;
			const naturalH = img.naturalHeight || 0;
			if (!naturalW || !naturalH) return;

			const fit = Math.min(rect.width / naturalW, rect.height / naturalH);
			const dispW = naturalW * fit;
			const dispH = naturalH * fit;
			const left = (rect.width - dispW) / 2;
			const top = (rect.height - dispH) / 2;
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			const insideImage =
				x >= left && x <= left + dispW && y >= top && y <= top + dispH;
			if (!insideImage) {
				onOpenChange(false);
			}
		},
		[onOpenChange],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="w-[96vw] max-w-none border-0 bg-transparent p-0 shadow-none sm:w-[95vw] sm:max-w-[95vw] md:w-[90vw] md:max-w-[90vw] lg:w-[85vw] lg:max-w-[85vw] xl:w-[80vw] xl:max-w-[80vw]"
			>
				<DialogHeader className="border-0">
					<VisuallyHidden>
						<DialogTitle>{alt}</DialogTitle>
					</VisuallyHidden>
				</DialogHeader>
				<div
					ref={containerRef}
					className="relative h-[90vh] w-full touch-none overflow-hidden"
					onWheel={handleWheel}
					onDoubleClick={onDoubleClick}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUpOrCancel}
					onPointerCancel={onPointerUpOrCancel}
					role="img"
					aria-label="Zoomable image viewer"
				>
					<div
						ref={contentRef}
						className="relative h-full w-full select-none"
						style={{
							transformOrigin: "0 0",
							willChange: "transform",
							backfaceVisibility: "hidden",
						}}
					>
						{/* biome-ignore lint/performance/noImgElement: viewer needs native img for precise pointer/pinch control */}
						<img
							src={src}
							alt={alt}
							className="absolute inset-0 h-full w-full object-contain"
							draggable={false}
							ref={imgRef}
							loading="eager"
							decoding="async"
						/>
					</div>
					{Toolbar}
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default ImageViewer;
