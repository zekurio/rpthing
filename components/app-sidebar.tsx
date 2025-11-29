import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CreateOrJoinRealmDialog } from "@/components/create-or-join-realm-dialog";
import { DeleteRealmDialog } from "@/components/delete-realm-dialog";
import { LeaveRealmDialog } from "@/components/leave-realm-dialog";
import { Logo } from "@/components/logo";
import { RealmSettingsDialog } from "@/components/realm-settings-dialog";
import { SidebarRealmList } from "@/components/sidebar-realm-list";
import { TransferOwnershipDialog } from "@/components/transfer-ownership-dialog";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const searchParams = useSearchParams();
	const currentRealmFilter = searchParams?.get("realm") ?? null;

	const { data, isPending } = useQuery({
		...trpc.realm.list.queryOptions(),
	});
	const [dialogOpen, setDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
	const [transferDialogOpen, setTransferDialogOpen] = useState(false);
	const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
	const [selectedRealm, setSelectedRealm] = useState<{
		id: string;
		name?: string;
	} | null>(null);
	const { user } = useAuth();

	const handleDeleteRealm = (realmId: string) => {
		const realm = data?.find((r) => r.id === realmId);
		setSelectedRealm({ id: realmId, name: realm?.name });
		setDeleteDialogOpen(true);
	};

	const handleLeaveRealm = (realmId: string) => {
		const realm = data?.find((r) => r.id === realmId);
		setSelectedRealm({ id: realmId, name: realm?.name });

		if (realm?.ownerId === user?.id) {
			setTransferDialogOpen(true);
		} else {
			setLeaveDialogOpen(true);
		}
	};

	const handleSettingsRealm = (realmId: string) => {
		const realm = data?.find((r) => r.id === realmId);
		setSelectedRealm({ id: realmId, name: realm?.name });
		setSettingsDialogOpen(true);
	};

	return (
		<Sidebar collapsible="offcanvas" variant="inset" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							className="transition-colors hover:bg-accent active:bg-accent"
						>
							<a href="/characters">
								<Logo />
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Realms</SidebarGroupLabel>
					<SidebarGroupAction
						onClick={() => setDialogOpen(true)}
						aria-label="Create or join realm"
					>
						<Plus />
					</SidebarGroupAction>
					<SidebarRealmList
						realms={data ?? []}
						currentRealmFilter={currentRealmFilter}
						isPending={isPending}
						currentUserId={user?.id}
						onDelete={handleDeleteRealm}
						onLeave={handleLeaveRealm}
						onSettings={handleSettingsRealm}
					/>
				</SidebarGroup>
			</SidebarContent>
			<CreateOrJoinRealmDialog open={dialogOpen} onOpenChange={setDialogOpen} />
			<DeleteRealmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				realmId={selectedRealm?.id ?? null}
				realmName={selectedRealm?.name}
				currentRealmId={currentRealmFilter}
			/>
			<LeaveRealmDialog
				open={leaveDialogOpen}
				onOpenChange={setLeaveDialogOpen}
				realmId={selectedRealm?.id ?? null}
				realmName={selectedRealm?.name}
				currentRealmId={currentRealmFilter}
			/>
			<TransferOwnershipDialog
				open={transferDialogOpen}
				onOpenChange={setTransferDialogOpen}
				realmId={selectedRealm?.id ?? null}
				realmName={selectedRealm?.name}
				currentRealmId={currentRealmFilter}
			/>
			<RealmSettingsDialog
				open={settingsDialogOpen}
				onOpenChange={setSettingsDialogOpen}
				realmId={selectedRealm?.id ?? null}
				realmName={selectedRealm?.name}
				currentUserId={user?.id}
			/>
			<SidebarFooter>
				<UserMenu />
			</SidebarFooter>
		</Sidebar>
	);
}
