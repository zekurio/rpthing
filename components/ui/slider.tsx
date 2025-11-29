"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";
import { cn } from "@/lib/utils";

function SliderThumb() {
	return (
		<SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
	);
}

const Slider = React.forwardRef<
	React.ElementRef<typeof SliderPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
	// Determine number of thumbs based on value/defaultValue array length
	const thumbCount = value?.length ?? defaultValue?.length ?? 1;

	return (
		<SliderPrimitive.Root
			ref={ref}
			className={cn(
				"relative flex w-full touch-none select-none items-center",
				className,
			)}
			value={value}
			defaultValue={defaultValue}
			{...props}
		>
			<SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
				<SliderPrimitive.Range className="absolute h-full bg-primary" />
			</SliderPrimitive.Track>
			{thumbCount === 1 && <SliderThumb />}
			{thumbCount >= 2 && (
				<>
					<SliderThumb />
					<SliderThumb />
				</>
			)}
		</SliderPrimitive.Root>
	);
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
