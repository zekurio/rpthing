import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CreateOrJoinRealmDialog } from "@/components/create-or-join-realm-dialog";
import { DeleteRealmDialog } from "@/components/delete-realm-dialog";
import EditRealmDialog from "@/components/edit-realm-dialog";
import { Logo } from "@/components/logo";
import { SidebarRealmList } from "@/components/sidebar-realm-list";
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
import { queryClient, trpc } from "@/lib/trpc";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const params = useParams();
	const rawRealmId = (params as Record<string, unknown>).realmId;
	const currentRealmId = Array.isArray(rawRealmId)
		? typeof rawRealmId[0] === "string"
			? rawRealmId[0]
			: null
		: typeof rawRealmId === "string"
			? rawRealmId
			: null;
	const { data, isPending } = useQuery({
		...trpc.realm.list.queryOptions(),
	});
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedRealm, setSelectedRealm] = useState<{
		id: string;
		name?: string;
	} | null>(null);
	const { user } = useAuth();

	// Mutations
	const leaveMutation = useMutation({
		...trpc.realm.leave.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trpc.realm.list.queryKey() });
			toast.success("Left realm successfully");
			// If we left the current realm, redirect to /realms
			if (selectedRealm?.id === currentRealmId) {
				window.location.href = "/realms";
			}
		},
		onError: (err) => toast.error(err.message),
	});

	const handleEditRealm = (realmId: string) => {
		const realm = data?.find((r) => r.id === realmId);
		setSelectedRealm({ id: realmId, name: realm?.name });
		setEditDialogOpen(true);
	};

	const handleDeleteRealm = (realmId: string) => {
		const realm = data?.find((r) => r.id === realmId);
		setSelectedRealm({ id: realmId, name: realm?.name });
		setDeleteDialogOpen(true);
	};

	const handleLeaveRealm = (realmId: string) => {
		leaveMutation.mutate(realmId);
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
							<a href="/realms">
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
						currentRealmId={currentRealmId}
						isPending={isPending}
						currentUserId={user?.id}
						onEdit={handleEditRealm}
						onDelete={handleDeleteRealm}
						onLeave={handleLeaveRealm}
					/>
				</SidebarGroup>
			</SidebarContent>
			<CreateOrJoinRealmDialog open={dialogOpen} onOpenChange={setDialogOpen} />
			<EditRealmDialog
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				realmId={selectedRealm?.id ?? null}
				realmName={selectedRealm?.name}
			/>
			<DeleteRealmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				realmId={selectedRealm?.id ?? null}
				realmName={selectedRealm?.name}
				currentRealmId={currentRealmId}
			/>
			<SidebarFooter>
				<UserMenu />
			</SidebarFooter>
		</Sidebar>
	);
}
