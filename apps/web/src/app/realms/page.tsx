"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CharacterOverview } from "@/components/character-overview";
import { CreateOrJoinRealmDialog } from "@/components/create-or-join-realm-dialog";
import { RecentActivity } from "@/components/recent-activity";
import { Button } from "@/components/ui/button";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuthGuard } from "@/hooks/use-realm-access";
import { trpc } from "@/utils/trpc";

export default function RealmsPage() {
	const { isAuthenticated } = useAuthGuard();
	const { data, error } = useQuery({
		...trpc.realm.list.queryOptions(),
		retry: 2,
		retryDelay: 1000,
	});
	const [dialogOpen, setDialogOpen] = useState(false);

	// If not authenticated, the hook will redirect to login
	if (!isAuthenticated) {
		return null;
	}

	// If there's an error, treat it as if there are no realms (show empty state)
	const realms = error ? [] : (data ?? []);

	if (realms.length === 0) {
		return (
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
						<SidebarTrigger />
						<div className="font-semibold">Dashboard</div>
					</div>
					<div className="flex h-full min-h-0 w-full flex-col">
						<div className="flex h-full min-h-0 overflow-hidden">
							<main className="flex-1 overflow-y-auto p-6">
								<div className="flex h-full flex-col items-center justify-center text-center">
									<div className="mb-4 text-6xl">🧹</div>
									<h1 className="font-bold text-2xl">
										It's quite empty in here.
									</h1>
									<p className="mt-2 max-w-md text-muted-foreground">
										No realms yet... maybe you should create one?
									</p>
									<div className="mt-6">
										<Button onClick={() => setDialogOpen(true)}>
											Create or join a realm
										</Button>
									</div>
								</div>
							</main>
						</div>
						<CreateOrJoinRealmDialog
							open={dialogOpen}
							onOpenChange={setDialogOpen}
						/>
					</div>
				</SidebarInset>
			</SidebarProvider>
		);
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<SidebarTrigger />
					<div className="font-semibold">Dashboard</div>
				</div>
				<div className="flex h-full min-h-0 w-full flex-col">
					<div className="flex h-full min-h-0 overflow-hidden">
						<main className="flex-1 space-y-6 overflow-y-auto p-6">
							<p className="mt-2 text-muted-foreground">
								Quick access to your recent characters and activity.
							</p>

							<div className="space-y-6">
								<CharacterOverview unstyled />
								<RecentActivity unstyled />
							</div>
						</main>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
