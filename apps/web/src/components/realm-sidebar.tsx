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
import { useIsMobile } from "@/hooks/use-mobile";
import { trpc } from "@/utils/trpc";

export function RealmSidebar() {
	const pathname = usePathname();
	const isMobile = useIsMobile();
	const { data, isPending } = useQuery(trpc.realm.list.queryOptions());

	const [createOrJoinDialogOpen, setCreateOrJoinDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedRealmId, setSelectedRealmId] = useState<string | null>(null);
	const [selectedRealmName, setSelectedRealmName] = useState<string>("");

	const realms = data ?? [];

	// serverUrl no longer needed - S3 URLs are returned directly from the API

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

	// Hide sidebar on mobile
	if (isMobile) {
		return null;
	}

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
					realmId={selectedRealmId}
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
