"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CreateOrJoinRealmDialog } from "@/components/create-or-join-realm-dialog";
import { RealmSidebar } from "@/components/realm-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
				<main className="flex-1 p-4">
					<div className="mb-6">
						<h1 className="font-bold text-2xl">Dashboard</h1>
						<p className="text-muted-foreground">
							Welcome back. Pick a realm from the left, or work on your stuff
							here.
						</p>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="font-semibold text-lg">
									Characters
								</CardTitle>
								<Button size="sm" variant="secondary">
									New Character
								</Button>
							</CardHeader>
							<CardContent className="space-y-4">
								<Input placeholder="Search characters" />
								<div className="space-y-3">
									<div className="flex items-center justify-between rounded-md border p-3">
										<div className="flex items-center gap-3">
											<div className="h-8 w-8 rounded-full bg-accent" />
											<div>
												<div className="font-medium">A mysterious wanderer</div>
												<div className="text-muted-foreground text-xs">
													Rogue • Level 3
												</div>
											</div>
										</div>
										<Button size="sm" variant="ghost">
											Open
										</Button>
									</div>
									<div className="flex items-center justify-between rounded-md border p-3">
										<div className="flex items-center gap-3">
											<div className="h-8 w-8 rounded-full bg-accent" />
											<div>
												<div className="font-medium">Sir Placeholder III</div>
												<div className="text-muted-foreground text-xs">
													Paladin • Level 7
												</div>
											</div>
										</div>
										<Button size="sm" variant="ghost">
											Open
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="font-semibold text-lg">Notes</CardTitle>
								<Button size="sm" variant="secondary">
									New Note
								</Button>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-3">
									<div className="rounded-md border p-3">
										<div className="font-medium">Quest ideas</div>
										<div className="text-muted-foreground text-xs">
											A dragon, but it just wants better zoning laws.
										</div>
									</div>
									<div className="rounded-md border p-3">
										<div className="font-medium">Shopping list</div>
										<div className="text-muted-foreground text-xs">
											Rations, rope, and a suspiciously specific amount of oil.
										</div>
									</div>
								</div>
								<div>
									<Textarea
										placeholder="Write a quick note..."
										className="min-h-[100px] resize-none"
									/>
									<div className="mt-2 flex justify-end">
										<Button size="sm">Save</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</main>
			</div>
		</div>
	);
}
