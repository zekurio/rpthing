"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 32;
const VISIBLE_ITEMS = 5;

interface PickerWheelProps {
	items: { value: string; label: string }[];
	value?: string;
	onChange?: (value: string) => void;
	className?: string;
	placeholder?: string;
}

export function PickerWheel({
	items,
	value,
	onChange,
	className,
	placeholder = "—",
}: PickerWheelProps) {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = React.useState(false);
	const [startY, setStartY] = React.useState(0);
	const [scrollOffset, setScrollOffset] = React.useState(0);
	const [velocity, setVelocity] = React.useState(0);
	const lastY = React.useRef(0);
	const lastTime = React.useRef(0);
	const animationRef = React.useRef<number | null>(null);
	const wheelTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	// Add placeholder as first item for "unset" state
	const allItems = React.useMemo(
		() => [{ value: "", label: placeholder }, ...items],
		[items, placeholder],
	);

	const selectedIndex = React.useMemo(() => {
		if (!value) return 0;
		const idx = allItems.findIndex((item) => item.value === value);
		return idx >= 0 ? idx : 0;
	}, [value, allItems]);

	// Initialize scroll position based on selected value
	React.useEffect(() => {
		setScrollOffset(-selectedIndex * ITEM_HEIGHT);
	}, [selectedIndex]);

	const clampOffset = React.useCallback(
		(offset: number) => {
			const minOffset = -(allItems.length - 1) * ITEM_HEIGHT;
			const maxOffset = 0;
			return Math.max(minOffset, Math.min(maxOffset, offset));
		},
		[allItems.length],
	);

	const snapToNearest = React.useCallback(
		(offset: number, withAnimation = true) => {
			const index = Math.round(-offset / ITEM_HEIGHT);
			const clampedIndex = Math.max(0, Math.min(allItems.length - 1, index));
			const targetOffset = -clampedIndex * ITEM_HEIGHT;

			if (withAnimation) {
				const startOffset = offset;
				const startTime = performance.now();
				const duration = 200;

				const animate = (currentTime: number) => {
					const elapsed = currentTime - startTime;
					const progress = Math.min(elapsed / duration, 1);
					const eased = 1 - (1 - progress) ** 3;
					const newOffset = startOffset + (targetOffset - startOffset) * eased;

					setScrollOffset(newOffset);

					if (progress < 1) {
						animationRef.current = requestAnimationFrame(animate);
					} else {
						setScrollOffset(targetOffset);
						const newValue = allItems[clampedIndex]?.value ?? "";
						if (newValue !== value) {
							onChange?.(newValue);
						}
					}
				};

				animationRef.current = requestAnimationFrame(animate);
			} else {
				setScrollOffset(targetOffset);
				const newValue = allItems[clampedIndex]?.value ?? "";
				if (newValue !== value) {
					onChange?.(newValue);
				}
			}
		},
		[allItems, onChange, value],
	);

	const handleMomentum = React.useCallback(
		(initialVelocity: number) => {
			let currentVelocity = initialVelocity;
			let currentOffset = scrollOffset;
			const friction = 0.92;
			const minVelocity = 0.5;

			const animate = () => {
				currentVelocity *= friction;
				currentOffset += currentVelocity;
				currentOffset = clampOffset(currentOffset);

				setScrollOffset(currentOffset);

				if (Math.abs(currentVelocity) > minVelocity) {
					animationRef.current = requestAnimationFrame(animate);
				} else {
					snapToNearest(currentOffset);
				}
			};

			animationRef.current = requestAnimationFrame(animate);
		},
		[scrollOffset, clampOffset, snapToNearest],
	);

	const handlePointerDown = (e: React.PointerEvent) => {
		if (animationRef.current) {
			cancelAnimationFrame(animationRef.current);
		}
		setIsDragging(true);
		setStartY(e.clientY - scrollOffset);
		lastY.current = e.clientY;
		lastTime.current = performance.now();
		setVelocity(0);
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	};

	const handlePointerMove = (e: React.PointerEvent) => {
		if (!isDragging) return;

		const currentY = e.clientY;
		const currentTime = performance.now();
		const deltaTime = currentTime - lastTime.current;

		if (deltaTime > 0) {
			const deltaY = currentY - lastY.current;
			setVelocity((deltaY / deltaTime) * 16);
		}

		lastY.current = currentY;
		lastTime.current = currentTime;

		const newOffset = clampOffset(currentY - startY);
		setScrollOffset(newOffset);
	};

	const handlePointerUp = (e: React.PointerEvent) => {
		if (!isDragging) return;
		setIsDragging(false);
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);

		if (Math.abs(velocity) > 2) {
			handleMomentum(velocity);
		} else {
			snapToNearest(scrollOffset);
		}
	};

	const handleWheel = (e: React.WheelEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (animationRef.current) {
			cancelAnimationFrame(animationRef.current);
		}
		if (wheelTimeoutRef.current) {
			clearTimeout(wheelTimeoutRef.current);
		}

		const delta = e.deltaY > 0 ? -ITEM_HEIGHT : ITEM_HEIGHT;
		const newOffset = clampOffset(scrollOffset + delta);
		setScrollOffset(newOffset);

		wheelTimeoutRef.current = setTimeout(() => {
			snapToNearest(newOffset);
		}, 100);
	};

	// Cleanup on unmount
	React.useEffect(() => {
		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
			if (wheelTimeoutRef.current) {
				clearTimeout(wheelTimeoutRef.current);
			}
		};
	}, []);

	const centerIndex = Math.floor(VISIBLE_ITEMS / 2);
	const wheelHeight = ITEM_HEIGHT * VISIBLE_ITEMS;

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative select-none overflow-hidden rounded-md border border-input bg-background",
				className,
			)}
			style={{
				height: wheelHeight,
				width: 64,
				touchAction: "none",
			}}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
			onWheel={handleWheel}
		>
			{/* Gradient overlays */}
			<div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-background via-background/80 to-transparent" />
			<div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-background via-background/80 to-transparent" />

			{/* Selection highlight */}
			<div
				className="pointer-events-none absolute inset-x-0.5 z-[5] rounded border border-primary/40 bg-primary/10"
				style={{
					top: centerIndex * ITEM_HEIGHT,
					height: ITEM_HEIGHT,
				}}
			/>

			{/* Items */}
			<div
				className="relative"
				style={{
					transform: `translateY(${scrollOffset + centerIndex * ITEM_HEIGHT}px)`,
					transition: isDragging ? "none" : "transform 50ms ease-out",
				}}
			>
				{allItems.map((item, index) => {
					const distanceFromCenter =
						index + scrollOffset / ITEM_HEIGHT + centerIndex;
					const absDistance = Math.abs(distanceFromCenter);
					const scale = Math.max(0.75, 1 - absDistance * 0.12);
					const opacity = Math.max(0.25, 1 - absDistance * 0.35);
					const rotateX = Math.min(Math.max(distanceFromCenter * -18, -45), 45);

					return (
						<div
							key={item.value || "__placeholder__"}
							className={cn(
								"flex items-center justify-center font-medium text-sm",
								item.value === "" && "text-muted-foreground",
							)}
							style={{
								height: ITEM_HEIGHT,
								transform: `perspective(150px) rotateX(${rotateX}deg) scale(${scale})`,
								opacity,
							}}
						>
							{item.label}
						</div>
					);
				})}
			</div>
		</div>
	);
}
