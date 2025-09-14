"use client";

import { Edit, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface Realm {
	id: string;
	name?: string;
	iconKey?: string | null;
}

interface RealmItemProps {
	realm: Realm;
	isSelected: boolean;
	onEdit: (realmId: string) => void;
	onDelete: (realmId: string) => void;
}

export function RealmItem({
	realm,
	isSelected,
	onEdit,
	onDelete,
}: RealmItemProps) {
	const router = useRouter();
	const [isImageLoaded, setIsImageLoaded] = useState(false);
	const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined);
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

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<div className="group relative">
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								className={`group/realm relative ${isSelected ? "rounded-full ring-2 ring-primary" : ""}`}
								type="button"
								onClick={() => handleRealmClick(realm.id)}
							>
								<Avatar className="h-10 w-10">
									<AvatarImage
										src={src}
										alt={realm.name}
										onLoad={handleImageLoad}
										onError={handleImageError}
									/>
									<AvatarFallback className="rounded-full">
										{realm.name?.[0]?.toUpperCase() || "R"}
									</AvatarFallback>
								</Avatar>
								{src && !isImageLoaded && (
									<div className="absolute inset-0 flex h-10 w-10 items-center justify-center">
										<Skeleton className="h-10 w-10 rounded-full" />
									</div>
								)}
							</button>
						</TooltipTrigger>
						<TooltipContent side="right">
							<p>{realm.name}</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onClick={() => onEdit(realm.id)}>
					<Edit className="mr-2 h-4 w-4" />
					Edit
				</ContextMenuItem>
				<ContextMenuItem
					onClick={() => onDelete(realm.id)}
					className="text-destructive focus:text-destructive"
				>
					<Trash className="mr-2 h-4 w-4" />
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
