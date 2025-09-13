"use client";

import { useParams } from "next/navigation";
import NotFound from "@/app/not-found";
import { RealmSidebar } from "@/components/realm-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealmAccess } from "@/hooks/use-realm-access";

export default function RealmPage() {
	const params = useParams();
	const realmId = params.realmId as string;

	const { realm, isLoading, hasAccess, shouldShowNotFound } =
		useRealmAccess(realmId);

	// If access is denied, render the not-found page
	if (shouldShowNotFound) {
		return <NotFound />;
	}

	// Show loading state while checking access
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

	// If no access or no realm data, return null
	if (!hasAccess || !realm) {
		return null;
	}

	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			<SiteHeader />
			<div className="flex h-full min-h-0">
				<RealmSidebar />
				<main className="flex-1 p-4">
					<div>
						<h1 className="font-bold text-2xl">{realm.name}</h1>
						<p className="text-muted-foreground">
							{realm.description ||
								"Content for the selected realm will go here."}
						</p>
						<div className="mt-4 text-muted-foreground text-sm">
							Role: {realm.role}
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
