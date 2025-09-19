import { useQuery } from "@tanstack/react-query";
import { Dices, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CreateOrJoinRealmDialog } from "@/components/create-or-join-realm-dialog";
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
import { trpc } from "@/utils/trpc";

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

	return (
		<Sidebar collapsible="offcanvas" variant="inset" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<a href="/realms">
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
									<Dices className="size-4 text-neutral-900" />
								</div>
								<div className="flex flex-col gap-0.5 leading-none">
									<span className="font-bold font-lg">rpthing</span>
								</div>
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
					/>
				</SidebarGroup>
			</SidebarContent>
			<CreateOrJoinRealmDialog open={dialogOpen} onOpenChange={setDialogOpen} />
			<SidebarFooter>
				<UserMenu />
			</SidebarFooter>
		</Sidebar>
	);
}
