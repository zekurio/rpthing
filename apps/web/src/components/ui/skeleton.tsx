import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const skeletonVariants = cva("animate-pulse rounded-md bg-accent", {
	variants: {
		// Text size variants that match common text classes
		size: {
			xs: "h-3",
			sm: "h-4",
			base: "h-5",
			lg: "h-6",
			xl: "h-7",
			"2xl": "h-8",
		},
	},
	defaultVariants: {
		size: "base",
	},
});

export interface SkeletonProps
	extends React.ComponentProps<"div">,
		VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, size, ...props }: SkeletonProps) {
	return (
		<div
			data-slot="skeleton"
			className={cn(skeletonVariants({ size }), className)}
			{...props}
		/>
	);
}

export { Skeleton };
