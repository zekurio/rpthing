"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { CreateOrJoinRealmDialog } from "@/components/create-or-join-realm-dialog";
import { CreateRealmButton } from "@/components/create-realm-button";
import { DeleteRealmDialog } from "@/components/delete-realm-dialog";
import { EditRealmDialog } from "@/components/edit-realm-dialog";
import { RealmList } from "@/components/realm-list";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trpc } from "@/utils/trpc";

export function RealmSidebar() {
	const pathname = usePathname();
	const { data, isPending, error } = useQuery({
		...trpc.realm.list.queryOptions(),
		retry: 2,
		retryDelay: 1000,
	});

	const [createOrJoinDialogOpen, setCreateOrJoinDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedRealmId, setSelectedRealmId] = useState<string | null>(null);
	const [selectedRealmName, setSelectedRealmName] = useState<string>("");

	// If there's an error, treat it as if there are no realms (show empty state)
	// This provides a better UX than showing an error when the user has no realms
	const realms = error ? [] : (data ?? []);

	// Get current realm ID from pathname (e.g., /realms/123 -> "123")
	const currentRealmId = useMemo(() => {
		const match = pathname.match(/^\/realms\/([^/]+)/);
		return match ? match[1] : null;
	}, [pathname]);

	const handleEdit = (realmId: string) => {
		setSelectedRealmId(realmId);
		setEditDialogOpen(true);
	};

	const handleDelete = (realmId: string) => {
		const realm = realms.find((r) => r.id === realmId);
		setSelectedRealmId(realmId);
		setSelectedRealmName(realm?.name || "");
		setDeleteDialogOpen(true);
	};

	return (
		<TooltipProvider>
			<aside className="flex h-full min-h-0 w-16 shrink-0 flex-col items-center border-r bg-background">
				<RealmList
					realms={realms}
					isPending={isPending}
					currentRealmId={currentRealmId}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>
				<CreateRealmButton onClick={() => setCreateOrJoinDialogOpen(true)} />
				<CreateOrJoinRealmDialog
					open={createOrJoinDialogOpen}
					onOpenChange={setCreateOrJoinDialogOpen}
				/>
				<EditRealmDialog
					open={editDialogOpen}
					onOpenChange={setEditDialogOpen}
				/>
				<DeleteRealmDialog
					open={deleteDialogOpen}
					onOpenChange={setDeleteDialogOpen}
					realmId={selectedRealmId}
					realmName={selectedRealmName}
				/>
			</aside>
		</TooltipProvider>
	);
}

export default RealmSidebar;
