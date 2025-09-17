"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CharacterOverview } from "@/components/character-overview";
import { CreateOrJoinRealmDialog } from "@/components/create-or-join-realm-dialog";
import { RealmSidebar } from "@/components/realm-sidebar";
import { RecentActivity } from "@/components/recent-activity";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/use-realm-access";
import { trpc } from "@/utils/trpc";

export default function RealmsPage() {
	const { isLoading, isAuthenticated } = useAuthGuard();
	const { data, isPending, error } = useQuery({
		...trpc.realm.list.queryOptions(),
		retry: 2, // Retry failed requests up to 2 times
		retryDelay: 1000, // Wait 1 second between retries
	});
	const [dialogOpen, setDialogOpen] = useState(false);

	// Show loading state while checking authentication
	if (isLoading) {
		return (
			<div className="flex h-full min-h-0 w-full flex-col">
				<SiteHeader />
				<div className="flex h-full min-h-0">
					<RealmSidebar />
					<main className="flex-1 p-4">
						<div className="space-y-4">
							<Skeleton className="h-8 w-48" />
							<Skeleton className="h-4 w-96" />
						</div>
					</main>
				</div>
			</div>
		);
	}

	// If not authenticated, the hook will redirect to login
	if (!isAuthenticated) {
		return null;
	}

	// Pending realms fetch
	if (isPending) {
		return (
			<div className="flex h-full min-h-0 w-full flex-col">
				<SiteHeader />
				<div className="flex h-full min-h-0">
					<RealmSidebar />
					<main className="flex-1 p-4">
						<div className="space-y-4">
							<Skeleton className="h-8 w-56" />
							<Skeleton className="h-4 w-[28rem]" />
						</div>
					</main>
				</div>
			</div>
		);
	}

	// If there's an error, treat it as if there are no realms (show empty state)
	// This provides a better UX than showing an error when the user has no realms
	const realms = error ? [] : (data ?? []);

	// Empty state when the user has no realms
	if (realms.length === 0) {
		return (
			<div className="flex h-full min-h-0 w-full flex-col">
				<SiteHeader />
				<div className="flex h-full min-h-0">
					<RealmSidebar />
					<main className="flex-1 p-6">
						<div className="flex h-full flex-col items-center justify-center text-center">
							<div className="mb-4 text-6xl">🧹</div>
							<h1 className="font-bold text-2xl">It's quite empty in here.</h1>
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
		);
	}

	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			<SiteHeader />
			<div className="flex h-full min-h-0">
				<RealmSidebar />
				<main className="flex-1 space-y-6 p-6">
					<div className="mb-6">
						<h1 className="font-bold text-3xl">Dashboard</h1>
						<p className="mt-2 text-muted-foreground">
							Quick access to your recent characters and activity.
						</p>
					</div>

					<div className="space-y-6">
						<CharacterOverview />
						<RecentActivity />
					</div>
				</main>
			</div>
		</div>
	);
}
