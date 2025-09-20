"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

interface LoadingTextProps {
	text?: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}

interface LoadingStateProps {
	variant?: "spinner" | "text" | "skeleton";
	text?: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}

interface LoadingOverlayProps {
	isLoading: boolean;
	text?: string;
	children: React.ReactNode;
	className?: string;
}

export function LoadingSpinner({
	size = "md",
	className,
}: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: "h-4 w-4",
		md: "h-6 w-6",
		lg: "h-8 w-8",
	};

	return (
		<Loader2
			className={cn(
				"animate-spin text-muted-foreground",
				sizeClasses[size],
				className,
			)}
		/>
	);
}

export function LoadingText({
	text = "Loading...",
	size = "md",
	className,
}: LoadingTextProps) {
	const sizeClasses = {
		sm: "text-sm",
		md: "text-base",
		lg: "text-lg",
	};

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<LoadingSpinner size="sm" />
			<span className={cn("text-muted-foreground", sizeClasses[size])}>
				{text}
			</span>
		</div>
	);
}

export function LoadingState({
	variant = "spinner",
	text,
	size = "md",
	className,
}: LoadingStateProps) {
	switch (variant) {
		case "text":
			return <LoadingText text={text} size={size} className={className} />;
		case "skeleton":
			return <Skeleton className={className} />;
		default:
			return <LoadingSpinner size={size} className={className} />;
	}
}

export function LoadingOverlay({
	isLoading,
	text = "Loading...",
	children,
	className,
}: LoadingOverlayProps) {
	if (!isLoading) return <>{children}</>;

	return (
		<div className={cn("relative", className)}>
			{children}
			<div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
				<LoadingText text={text} />
			</div>
		</div>
	);
}

// Button loading variant for consistent button loading states
export function ButtonLoading({
	loading,
	children,
}: {
	loading: boolean;
	children: React.ReactNode;
}) {
	if (!loading) return <>{children}</>;

	return (
		<>
			<LoadingSpinner size="sm" className="mr-2" />
			{children}
		</>
	);
}

// Inline loading for replacing text content
export function InlineLoading({
	text = "Loading...",
	className,
}: {
	text?: string;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			<LoadingSpinner size="sm" />
			<span className="text-muted-foreground">{text}</span>
		</div>
	);
}
