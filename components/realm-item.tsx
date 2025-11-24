"use client";

import { Edit, LogOut, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface Realm {
	id: string;
	name?: string;
	iconKey?: string | null;
	ownerId?: string;
	memberCount?: number;
}

interface RealmItemProps {
	realm: Realm;
	isSelected: boolean;
	onEdit: (realmId: string) => void;
	onDelete: (realmId: string) => void;
	onLeave: (realmId: string) => void;
	isOwner?: boolean;
}

export function RealmItem({
	realm,
	isSelected,
	onEdit,
	onDelete,
	onLeave,
	isOwner = false,
}: RealmItemProps) {
	const router = useRouter();
	const [isImageLoaded, setIsImageLoaded] = useState(false);
	const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined);
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
	const longPressTimerRef = useRef<number | null>(null);
	const longPressTriggeredRef = useRef(false);
	const contextMenuUsedRef = useRef(false);
	const buttonRef = useRef<HTMLDivElement | null>(null);
	const src = realm.iconKey || undefined;

	// Reset loading state when image source changes
	useEffect(() => {
		if (src !== currentSrc) {
			setCurrentSrc(src);
			setIsImageLoaded(false);

			// Check if image is already cached
			if (src) {
				const img = new Image();
				img.onload = () => setIsImageLoaded(true);
				img.onerror = () => setIsImageLoaded(true);
				img.src = src;
			}
		}
	}, [src, currentSrc]);

	const handleRealmClick = (realmId: string) => {
		router.push(`/realms/${realmId}`);
	};

	const handleImageLoad = () => {
		setIsImageLoaded(true);
	};

	const handleImageError = () => {
		setIsImageLoaded(true);
	};

	const handleTouchStart: React.TouchEventHandler<HTMLButtonElement> = () => {
		if (!isOwner) return;
		longPressTimerRef.current = window.setTimeout(() => {
			longPressTriggeredRef.current = true;
			if (buttonRef.current) {
				const event = new MouseEvent("contextmenu", {
					bubbles: true,
					cancelable: true,
					view: window,
					clientX: 0,
					clientY: 0,
				});
				buttonRef.current.dispatchEvent(event);
			}
		}, 450);
	};

	const handleTouchEnd: React.TouchEventHandler<HTMLButtonElement> = () => {
		if (longPressTimerRef.current) {
			clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
		}
	};

	useEffect(
		() => () => {
			if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
		},
		[],
	);

	const handleButtonClick = () => {
		if (
			isContextMenuOpen ||
			longPressTriggeredRef.current ||
			contextMenuUsedRef.current
		) {
			longPressTriggeredRef.current = false;
			contextMenuUsedRef.current = false;
			return;
		}
		handleRealmClick(realm.id);
	};

	const realmButton = (
		<div
			className={`group relative w-full rounded-md transition-colors hover:bg-accent ${isSelected ? "bg-accent" : ""}`}
		>
			<Button
				variant="ghost"
				className="h-auto w-full justify-start gap-3 p-2"
				onClick={handleButtonClick}
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
			>
				<Avatar className="h-8 w-8 shrink-0">
					<AvatarImage
						src={src}
						alt={realm.name}
						onLoad={handleImageLoad}
						onError={handleImageError}
					/>
					<AvatarFallback>
						{realm.name?.[0]?.toUpperCase() || "R"}
					</AvatarFallback>
				</Avatar>
				<span className="truncate font-medium text-sm">{realm.name}</span>
				{src && !isImageLoaded && (
					<div className="absolute inset-2 flex items-center justify-center">
						<Skeleton size="2xl" className="rounded-lg" />
					</div>
				)}
			</Button>
		</div>
	);

	return (
		<ContextMenu onOpenChange={setIsContextMenuOpen}>
			<ContextMenuTrigger asChild>{realmButton}</ContextMenuTrigger>
			<ContextMenuContent>
				{isOwner ? (
					<>
						<ContextMenuItem
							onSelect={() => {
								contextMenuUsedRef.current = true;
								onEdit(realm.id);
							}}
						>
							<Edit className="mr-2 h-4 w-4" />
							Edit
						</ContextMenuItem>
						{realm.memberCount === 1 ? (
							<ContextMenuItem
								onSelect={() => {
									contextMenuUsedRef.current = true;
									onDelete(realm.id);
								}}
								className="text-destructive focus:text-destructive"
							>
								<Trash className="mr-2 h-4 w-4" />
								Delete
							</ContextMenuItem>
						) : (
							<ContextMenuItem
								onSelect={() => {
									contextMenuUsedRef.current = true;
									onLeave(realm.id);
								}}
								className="text-destructive focus:text-destructive"
							>
								<LogOut className="mr-2 h-4 w-4" />
								Leave
							</ContextMenuItem>
						)}
					</>
				) : (
					<ContextMenuItem
						onSelect={() => {
							contextMenuUsedRef.current = true;
							onLeave(realm.id);
						}}
					>
						<LogOut className="mr-2 h-4 w-4" />
						Leave
					</ContextMenuItem>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
