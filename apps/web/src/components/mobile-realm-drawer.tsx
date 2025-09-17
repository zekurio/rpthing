"use client";

import { useQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { CreateOrJoinRealmDialog } from "@/components/create-or-join-realm-dialog";
import { CreateRealmButton } from "@/components/create-realm-button";
import { DeleteRealmDialog } from "@/components/delete-realm-dialog";
import { EditRealmDialog } from "@/components/edit-realm-dialog";
import { RealmList } from "@/components/realm-list";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/utils/trpc";

export function MobileRealmDrawer() {
	const pathname = usePathname();
	const { user } = useAuth();
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

	const realms = error ? [] : (data ?? []);

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
		<Sheet>
			<SheetTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="sm:hidden"
					aria-label="Open realm drawer"
				>
					<Menu className="h-5 w-5" />
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="p-0">
				<SheetHeader className="border-b p-4">
					<SheetTitle>Realms</SheetTitle>
				</SheetHeader>
				<TooltipProvider>
					<div className="flex h-[calc(100vh-4rem)] min-h-0 w-full flex-col overflow-y-auto p-4">
						<RealmList
							realms={realms}
							isPending={isPending}
							currentRealmId={currentRealmId}
							onEdit={handleEdit}
							onDelete={handleDelete}
							currentUserId={user?.id}
						/>
						<div className="mt-4">
							<CreateRealmButton onClick={() => setCreateOrJoinDialogOpen(true)} />
						</div>
					</div>
				</TooltipProvider>
				<CreateOrJoinRealmDialog
					open={createOrJoinDialogOpen}
					onOpenChange={setCreateOrJoinDialogOpen}
				/>
				<EditRealmDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} />
				<DeleteRealmDialog
					open={deleteDialogOpen}
					onOpenChange={setDeleteDialogOpen}
					realmId={selectedRealmId}
					realmName={selectedRealmName}
				/>
			</SheetContent>
		</Sheet>
	);
}

export default MobileRealmDrawer;

