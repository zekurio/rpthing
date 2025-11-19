"use client";

import { RealmItem } from "@/components/realm-item";

interface Realm {
	id: string;
	name?: string;
	iconKey?: string | null;
	ownerId?: string;
	memberCount?: number;
}

interface RealmListProps {
	realms: Realm[];
	isPending: boolean;
	currentRealmId: string | null;
	onEdit: (realmId: string) => void;
	onDelete: (realmId: string) => void;
	onLeave: (realmId: string) => void;
	currentUserId?: string;
	footer?: React.ReactNode;
}

export function RealmList({
	realms,
	isPending,
	currentRealmId,
	onEdit,
	onDelete,
	onLeave,
	currentUserId,
	footer,
}: RealmListProps) {
	return (
		<div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto py-3">
			{isPending ? (
				<div className="h-10 w-10 animate-pulse rounded-lg bg-accent" />
			) : (
				realms.map((realm) => (
					<RealmItem
						key={realm.id}
						realm={realm}
						isSelected={currentRealmId === realm.id}
						onEdit={onEdit}
						onDelete={onDelete}
						onLeave={onLeave}
						isOwner={currentUserId ? realm.ownerId === currentUserId : false}
					/>
				))
			)}
			{footer ? <div className="pt-1">{footer}</div> : null}
		</div>
	);
}
