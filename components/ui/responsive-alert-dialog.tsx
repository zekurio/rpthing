"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as React from "react";
import { Drawer } from "vaul";
import { buttonVariants } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface ResponsiveAlertDialogProps {
	children: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

const ResponsiveAlertDialogContext = React.createContext<{
	isDesktop: boolean;
}>({
	isDesktop: true,
});

function useResponsiveAlertDialog() {
	const context = React.useContext(ResponsiveAlertDialogContext);
	if (!context) {
		throw new Error(
			"useResponsiveAlertDialog must be used within a ResponsiveAlertDialog",
		);
	}
	return context;
}

function ResponsiveAlertDialog({
	children,
	open,
	onOpenChange,
}: ResponsiveAlertDialogProps) {
	const isDesktop = useMediaQuery("(min-width: 640px)");

	if (isDesktop) {
		return (
			<ResponsiveAlertDialogContext.Provider value={{ isDesktop: true }}>
				<AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
					{children}
				</AlertDialogPrimitive.Root>
			</ResponsiveAlertDialogContext.Provider>
		);
	}

	return (
		<ResponsiveAlertDialogContext.Provider value={{ isDesktop: false }}>
			<Drawer.Root open={open} onOpenChange={onOpenChange}>
				{children}
			</Drawer.Root>
		</ResponsiveAlertDialogContext.Provider>
	);
}

function ResponsiveAlertDialogTrigger({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
	const { isDesktop } = useResponsiveAlertDialog();

	if (isDesktop) {
		return <AlertDialogPrimitive.Trigger className={className} {...props} />;
	}

	return <Drawer.Trigger className={className} {...props} />;
}

function ResponsiveAlertDialogContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
	const { isDesktop } = useResponsiveAlertDialog();

	if (isDesktop) {
		return (
			<AlertDialogPrimitive.Portal>
				<AlertDialogPrimitive.Overlay className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in" />
				<AlertDialogPrimitive.Content
					className={cn(
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in sm:max-w-lg",
						className,
					)}
					{...props}
				>
					{children}
				</AlertDialogPrimitive.Content>
			</AlertDialogPrimitive.Portal>
		);
	}

	return (
		<Drawer.Portal>
			<Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
			<Drawer.Content
				className={cn(
					"fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[96vh] flex-col rounded-t-xl border border-border bg-background",
					className,
				)}
			>
				<div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
				<div className="flex flex-1 flex-col overflow-hidden p-4">
					{children}
				</div>
			</Drawer.Content>
		</Drawer.Portal>
	);
}

function ResponsiveAlertDialogHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	const { isDesktop } = useResponsiveAlertDialog();

	return (
		<div
			className={cn(
				"flex flex-col gap-2 text-left",
				!isDesktop && "pb-2",
				className,
			)}
			{...props}
		/>
	);
}

function ResponsiveAlertDialogFooter({
	className,
	...props
}: React.ComponentProps<"div">) {
	const { isDesktop } = useResponsiveAlertDialog();

	if (isDesktop) {
		return (
			<div
				className={cn(
					"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
					className,
				)}
				{...props}
			/>
		);
	}

	return (
		<div
			className={cn(
				"flex flex-col-reverse gap-2 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
				className,
			)}
			{...props}
		/>
	);
}

function ResponsiveAlertDialogTitle({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
	const { isDesktop } = useResponsiveAlertDialog();

	if (isDesktop) {
		return (
			<AlertDialogPrimitive.Title
				className={cn("font-semibold text-lg", className)}
				{...props}
			/>
		);
	}

	return (
		<Drawer.Title
			className={cn("font-semibold text-lg", className)}
			{...props}
		/>
	);
}

function ResponsiveAlertDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
	const { isDesktop } = useResponsiveAlertDialog();

	if (isDesktop) {
		return (
			<AlertDialogPrimitive.Description
				className={cn("text-muted-foreground text-sm", className)}
				{...props}
			/>
		);
	}

	return (
		<Drawer.Description
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

function ResponsiveAlertDialogAction({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
	const { isDesktop } = useResponsiveAlertDialog();

	if (isDesktop) {
		return (
			<AlertDialogPrimitive.Action
				className={cn(buttonVariants(), className)}
				{...props}
			/>
		);
	}

	return (
		<Drawer.Close
			className={cn(buttonVariants(), "w-full sm:w-auto", className)}
			{...props}
		/>
	);
}

function ResponsiveAlertDialogCancel({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
	const { isDesktop } = useResponsiveAlertDialog();

	if (isDesktop) {
		return (
			<AlertDialogPrimitive.Cancel
				className={cn(buttonVariants({ variant: "outline" }), className)}
				{...props}
			/>
		);
	}

	return (
		<Drawer.Close
			className={cn(
				buttonVariants({ variant: "outline" }),
				"w-full sm:w-auto",
				className,
			)}
			{...props}
		/>
	);
}

export {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogTrigger,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogTitle,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	useResponsiveAlertDialog,
};
