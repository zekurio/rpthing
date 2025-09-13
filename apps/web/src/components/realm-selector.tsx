"use client";

import { useQuery } from "@tanstack/react-query";
import { Crown, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/utils/trpc";

interface Realm {
	id: string;
	name?: string;
	role: string;
}

interface RealmSelectorProps {
	onJoinRealm: () => void;
	onCreateRealm: () => void;
}

export function RealmSelector({
	onJoinRealm,
	onCreateRealm,
}: RealmSelectorProps) {
	const realms = useQuery(trpc.realm.list.queryOptions());

	const handleSelectRealm = (realmId: string) => {
		try {
			localStorage.setItem("activeRealmId", realmId);
			toast.success("Active realm updated.");
		} catch {
			toast.error("Failed to set active realm.");
		}
	};

	return (
		<>
			<div className="mb-2 font-medium text-muted-foreground text-xs">
				Realms
			</div>
			<DropdownMenuGroup>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>Select world</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						{realms.isLoading && (
							<DropdownMenuItem>Loading...</DropdownMenuItem>
						)}
						{realms.data?.length === 0 && (
							<DropdownMenuItem>No realms</DropdownMenuItem>
						)}
						{realms.data?.map((r: Realm) => (
							<DropdownMenuItem
								key={r.id}
								onClick={() => handleSelectRealm(r.id)}
							>
								{r.role === "owner" && <Crown className="mr-2 size-4" />}
								<span className="truncate">{r.name ?? r.id}</span>
							</DropdownMenuItem>
						))}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuItem onClick={onJoinRealm}>
					<UserPlus className="mr-2 size-4" />
					Join realm
				</DropdownMenuItem>
				<DropdownMenuItem onClick={onCreateRealm}>
					<Plus className="mr-2 size-4" />
					Create realm
				</DropdownMenuItem>
			</DropdownMenuGroup>
		</>
	);
}
