"use client";

import { Edit, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
	serverUrl: string;
	onEdit: (realmId: string) => void;
	onDelete: (realmId: string) => void;
}

export function RealmItem({
	realm,
	isSelected,
	serverUrl,
	onEdit,
	onDelete,
}: RealmItemProps) {
	const router = useRouter();
	const src = realm.iconKey ? `${serverUrl}${realm.iconKey}` : undefined;

	const handleRealmClick = (realmId: string) => {
		router.push(`/realms/${realmId}`);
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<div className="group relative">
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								className={`group/realm ${isSelected ? "rounded-full ring-2 ring-primary" : ""}`}
								type="button"
								onClick={() => handleRealmClick(realm.id)}
							>
								<Avatar className="h-10 w-10">
									<AvatarImage src={src || ""} alt={realm.name} />
									<AvatarFallback className="rounded-full">
										{realm.name?.[0]?.toUpperCase() || "R"}
									</AvatarFallback>
								</Avatar>
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
