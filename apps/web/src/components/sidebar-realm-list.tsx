"use client";

import { RealmItem } from "@/components/realm-item";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";

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
	currentUserId,
	onEdit,
	onDelete,
	onLeave,
}: {
	realms: Realm[];
	currentRealmId?: string | null;
	isPending?: boolean;
	currentUserId?: string;
	onEdit: (realmId: string) => void;
	onDelete: (realmId: string) => void;
	onLeave: (realmId: string) => void;
}) {
	if (isPending) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<div className="flex items-center gap-3 rounded-md p-2">
						<div className="size-6 rounded-lg bg-accent" />
						<span className="h-4 w-24 rounded bg-accent" />
					</div>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	// Handle empty realms gracefully
	if (!realms || realms.length === 0) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<div className="flex items-center gap-3 rounded-md p-2 text-muted-foreground">
						<span className="text-sm">No realms yet</span>
					</div>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	return (
		<SidebarMenu>
			{realms.map((realm) => {
				const isSelected = currentRealmId === realm.id;
				const isOwner = Boolean(
					currentUserId && realm.ownerId === currentUserId,
				);
				return (
					<SidebarMenuItem key={realm.id}>
						<RealmItem
							realm={realm}
							isSelected={isSelected}
							isOwner={isOwner}
							onEdit={onEdit}
							onDelete={onDelete}
							onLeave={onLeave}
						/>
					</SidebarMenuItem>
				);
			})}
		</SidebarMenu>
	);
}
