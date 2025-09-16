"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { trpc } from "@/utils/trpc";

interface MemberSidebarProps {
	realmId: string;
	forceVisible?: boolean;
}

interface Owner {
	userId: string;
	name: string | null;
	email: string;
	image: string | null;
	createdAt: string;
}

export function MemberSidebar({
	realmId,
	forceVisible = false,
}: MemberSidebarProps) {
	const isMobile = useIsMobile();
	const { data: owner, isLoading } = useQuery({
		...trpc.realm.getOwner.queryOptions({ realmId }),
		enabled: !isMobile || forceVisible,
	});

	// Hide on mobile unless explicitly forced (e.g., inside a mobile drawer)
	if (isMobile && !forceVisible) {
		return null;
	}

	if (isLoading) {
		return (
			<aside className="flex h-full min-h-0 w-64 shrink-0 flex-col border-r bg-background">
				<div className="border-b p-4">
					<h2 className="font-semibold">Members</h2>
				</div>
				<div className="flex-1 space-y-3 p-4">
					{Array.from({ length: 3 }, (_, i) => {
						const skeletonId = `skeleton-member-${i}`;
						return (
							<div key={skeletonId} className="flex items-center space-x-3">
								<Skeleton className="h-8 w-8 rounded-full" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-3 w-16" />
								</div>
							</div>
						);
					})}
				</div>
			</aside>
		);
	}

	if (!owner) {
		return (
			<aside className="flex h-full min-h-0 w-64 shrink-0 flex-col border-r bg-background">
				<div className="border-b p-4">
					<h2 className="font-semibold">Owner</h2>
				</div>
				<div className="flex-1 p-4">
					<p className="text-muted-foreground text-sm">Owner not found</p>
				</div>
			</aside>
		);
	}

	const getRoleColor = () => "text-yellow-600 dark:text-yellow-400";
	const getRoleBadge = () => "👑";

	return (
		<aside className="flex h-full min-h-0 w-64 shrink-0 flex-col border-r bg-background">
			<div className="border-b border-l p-4">
				<h2 className="flex items-center gap-2 font-semibold">Owner</h2>
			</div>
			<div className="flex-1 space-y-3 border-l p-4">
				<OwnerRow
					owner={owner}
					getRoleBadge={getRoleBadge}
					getRoleColor={getRoleColor}
				/>
			</div>
		</aside>
	);
}

function OwnerRow({
	owner,
	getRoleBadge,
	getRoleColor,
}: {
	owner: Owner;
	getRoleBadge: () => string;
	getRoleColor: () => string;
}) {
	const [open, setOpen] = useState(false);
	const longPressTimerRef = useRef<number | null>(null);
	const startXRef = useRef(0);
	const startYRef = useRef(0);

	const clearLongPress = () => {
		if (longPressTimerRef.current !== null) {
			window.clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
		}
	};

	const handlePointerDown: React.PointerEventHandler<HTMLButtonElement> = (
		e,
	) => {
		startXRef.current = e.clientX;
		startYRef.current = e.clientY;
		clearLongPress();
		longPressTimerRef.current = window.setTimeout(() => {
			setOpen(true);
		}, 450);
	};

	const handlePointerMove: React.PointerEventHandler<HTMLButtonElement> = (
		e,
	) => {
		if (longPressTimerRef.current === null) return;
		const dx = e.clientX - startXRef.current;
		const dy = e.clientY - startYRef.current;
		if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
			clearLongPress();
		}
	};

	const handlePointerUpOrCancel: React.PointerEventHandler<
		HTMLButtonElement
	> = () => {
		clearLongPress();
	};

	const handleClick: React.MouseEventHandler<HTMLButtonElement> = () => {
		setOpen(true);
	};

	const copy = async (text: string, label: string) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(`${label} copied`);
		} catch {
			toast.error(`Failed to copy ${label.toLowerCase()}`);
		}
	};

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex w-full items-center space-x-3 text-left"
					aria-haspopup="menu"
					aria-expanded={open}
					onClick={handleClick}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUpOrCancel}
					onPointerCancel={handlePointerUpOrCancel}
					onPointerLeave={handlePointerUpOrCancel}
				>
					<Avatar className="h-8 w-8">
						<AvatarImage src={owner.image || undefined} />
						<AvatarFallback>
							{owner.name?.charAt(0).toUpperCase() || "?"}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1">
							<p className="truncate font-medium text-sm">{owner.name}</p>
							<span className="text-xs">{getRoleBadge()}</span>
						</div>
						<p className={`text-xs ${getRoleColor()}`}>owner</p>
					</div>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem disabled>
					<span className="mr-1 text-xs">{getRoleBadge()}</span>
					owner
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => copy(owner.email, "Email")}>
					Copy email
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => copy(owner.userId, "User ID")}>
					Copy user ID
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
