"use client";

import * as React from "react";
import { Drawer } from "vaul";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface ResponsiveDialogProps {
	children: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

interface ResponsiveDialogContentProps {
	children: React.ReactNode;
	className?: string;
	showCloseButton?: boolean;
}

interface ResponsiveDialogHeaderProps {
	children: React.ReactNode;
	className?: string;
}

interface ResponsiveDialogFooterProps {
	children: React.ReactNode;
	className?: string;
}

interface ResponsiveDialogTitleProps {
	children: React.ReactNode;
	className?: string;
}

interface ResponsiveDialogDescriptionProps {
	children: React.ReactNode;
	className?: string;
}

interface ResponsiveDialogTriggerProps {
	children: React.ReactNode;
	asChild?: boolean;
	className?: string;
}

interface ResponsiveDialogCloseProps {
	children: React.ReactNode;
	asChild?: boolean;
	className?: string;
}

interface ResponsiveDialogBodyProps {
	children: React.ReactNode;
	className?: string;
}

const ResponsiveDialogContext = React.createContext<{
	isDesktop: boolean;
}>({
	isDesktop: true,
});

function useResponsiveDialog() {
	const context = React.useContext(ResponsiveDialogContext);
	if (!context) {
		throw new Error(
			"useResponsiveDialog must be used within a ResponsiveDialog",
		);
	}
	return context;
}

function ResponsiveDialog({
	children,
	open,
	onOpenChange,
}: ResponsiveDialogProps) {
	const isDesktop = useMediaQuery("(min-width: 640px)");

	if (isDesktop) {
		return (
			<ResponsiveDialogContext.Provider value={{ isDesktop: true }}>
				<Dialog open={open} onOpenChange={onOpenChange}>
					{children}
				</Dialog>
			</ResponsiveDialogContext.Provider>
		);
	}

	return (
		<ResponsiveDialogContext.Provider value={{ isDesktop: false }}>
			<Drawer.Root open={open} onOpenChange={onOpenChange}>
				{children}
			</Drawer.Root>
		</ResponsiveDialogContext.Provider>
	);
}

function ResponsiveDialogTrigger({
	children,
	asChild,
	className,
}: ResponsiveDialogTriggerProps) {
	const { isDesktop } = useResponsiveDialog();

	if (isDesktop) {
		return (
			<DialogTrigger asChild={asChild} className={className}>
				{children}
			</DialogTrigger>
		);
	}

	return (
		<Drawer.Trigger asChild={asChild} className={className}>
			{children}
		</Drawer.Trigger>
	);
}

function ResponsiveDialogContent({
	children,
	className,
	showCloseButton = true,
}: ResponsiveDialogContentProps) {
	const { isDesktop } = useResponsiveDialog();

	if (isDesktop) {
		return (
			<DialogContent
				className={cn("flex max-h-[85vh] flex-col", className)}
				showCloseButton={showCloseButton}
			>
				{children}
			</DialogContent>
		);
	}

	// On mobile drawer, we don't show X button - users can swipe down or use Cancel button
	return (
		<Drawer.Portal>
			<Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
			<Drawer.Content
				className={cn(
					"fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[85vh] flex-col rounded-t-xl border border-border bg-background",
					className,
				)}
			>
				<div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
				<div className="flex min-h-0 flex-1 flex-col">{children}</div>
			</Drawer.Content>
		</Drawer.Portal>
	);
}

function ResponsiveDialogHeader({
	children,
	className,
}: ResponsiveDialogHeaderProps) {
	const { isDesktop } = useResponsiveDialog();

	if (isDesktop) {
		return <DialogHeader className={className}>{children}</DialogHeader>;
	}

	return (
		<div
			className={cn(
				"flex flex-col gap-1.5 border-border border-b px-4 pb-3 text-left",
				className,
			)}
		>
			{children}
		</div>
	);
}

function ResponsiveDialogFooter({
	children,
	className,
}: ResponsiveDialogFooterProps) {
	const { isDesktop } = useResponsiveDialog();

	if (isDesktop) {
		return <DialogFooter className={className}>{children}</DialogFooter>;
	}

	return (
		<div
			className={cn(
				"flex flex-col-reverse gap-2 border-border border-t px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end",
				className,
			)}
		>
			{children}
		</div>
	);
}

function ResponsiveDialogTitle({
	children,
	className,
}: ResponsiveDialogTitleProps) {
	const { isDesktop } = useResponsiveDialog();

	if (isDesktop) {
		return <DialogTitle className={className}>{children}</DialogTitle>;
	}

	return (
		<Drawer.Title
			className={cn(
				"truncate whitespace-nowrap font-semibold text-base leading-tight",
				className,
			)}
		>
			{children}
		</Drawer.Title>
	);
}

function ResponsiveDialogDescription({
	children,
	className,
}: ResponsiveDialogDescriptionProps) {
	const { isDesktop } = useResponsiveDialog();

	if (isDesktop) {
		return (
			<DialogDescription className={className}>{children}</DialogDescription>
		);
	}

	return (
		<Drawer.Description
			className={cn("text-muted-foreground text-xs", className)}
		>
			{children}
		</Drawer.Description>
	);
}

function ResponsiveDialogClose({
	children,
	asChild,
	className,
}: ResponsiveDialogCloseProps) {
	const { isDesktop } = useResponsiveDialog();

	if (isDesktop) {
		return (
			<DialogClose asChild={asChild} className={className}>
				{children}
			</DialogClose>
		);
	}

	return (
		<Drawer.Close asChild={asChild} className={className}>
			{children}
		</Drawer.Close>
	);
}

function ResponsiveDialogBody({
	children,
	className,
}: ResponsiveDialogBodyProps) {
	const { isDesktop } = useResponsiveDialog();

	if (isDesktop) {
		return (
			<div
				className={cn(
					"min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain",
					className,
				)}
			>
				{children}
			</div>
		);
	}

	return (
		<div
			className={cn(
				"scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3",
				className,
			)}
		>
			{children}
		</div>
	);
}

export {
	ResponsiveDialog,
	ResponsiveDialogTrigger,
	ResponsiveDialogContent,
	ResponsiveDialogHeader,
	ResponsiveDialogFooter,
	ResponsiveDialogTitle,
	ResponsiveDialogDescription,
	ResponsiveDialogClose,
	ResponsiveDialogBody,
	useResponsiveDialog,
};
