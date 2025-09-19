"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteRealmDialog } from "@/components/delete-realm-dialog";
import EditRealmDialog from "@/components/edit-realm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

type Realm = {
	id: string;
	name?: string;
	iconKey?: string | null;
	ownerId?: string;
};

export function SidebarRealmList({
	realms,
	currentRealmId,
	isPending = false,
}: {
	realms: Realm[];
	currentRealmId?: string | null;
	isPending?: boolean;
}) {
	const router = useRouter();
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [selected, setSelected] = useState<{
		id: string;
		name?: string;
	} | null>(null);

	if (isPending) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton className="h-9">
						<div className="size-6 rounded-full bg-accent" />
						<span className="ml-2 h-4 w-24 rounded bg-accent" />
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	// Handle empty realms gracefully
	if (!realms || realms.length === 0) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton className="h-9 text-muted-foreground" disabled>
						<span className="text-sm">No realms yet</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	return (
		<>
			<SidebarMenu>
				{realms.map((realm) => {
					const isActive = currentRealmId === realm.id;
					return (
						<SidebarMenuItem key={realm.id}>
							<SidebarMenuButton
								isActive={isActive}
								onClick={() => router.push(`/realms/${realm.id}`)}
								className="h-9"
							>
								<Avatar className="h-6 w-6">
									<AvatarImage
										src={realm.iconKey || undefined}
										alt={realm.name || "Realm"}
									/>
									<AvatarFallback className="rounded-full">
										{realm.name?.[0]?.toUpperCase() || "R"}
									</AvatarFallback>
								</Avatar>
								<span className="truncate">
									{realm.name || "Untitled Realm"}
								</span>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<SidebarMenuAction showOnHover asChild>
											<div className="after:-inset-2 absolute top-1.5 right-1 flex aspect-square w-5 cursor-pointer items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-transform after:absolute hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-hover/menu-button:text-sidebar-accent-foreground data-[state=open]:opacity-100 group-data-[collapsible=icon]:hidden peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0">
												<MoreVertical />
												<span className="sr-only">Open menu</span>
											</div>
										</SidebarMenuAction>
									</DropdownMenuTrigger>
									<DropdownMenuContent side="right" align="start">
										<DropdownMenuItem
											onClick={() => {
												setSelected({ id: realm.id, name: realm.name });
												if (realm.id === currentRealmId) {
													setEditOpen(true);
												} else {
													router.push(`/realms/${realm.id}?edit=1`);
												}
											}}
										>
											<Pencil />
											Edit
										</DropdownMenuItem>
										<DropdownMenuItem
											className="text-destructive focus:bg-destructive/10 focus:text-destructive"
											onClick={() => {
												setSelected({ id: realm.id, name: realm.name });
												setDeleteOpen(true);
											}}
										>
											<Trash2 />
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
			{currentRealmId && (
				<EditRealmDialog open={editOpen} onOpenChange={setEditOpen} />
			)}
			<DeleteRealmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				realmId={selected?.id ?? null}
				realmName={selected?.name}
				currentRealmId={currentRealmId}
			/>
		</>
	);
}
