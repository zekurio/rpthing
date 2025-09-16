"use client";

import { useParams } from "next/navigation";
import NotFound from "@/app/not-found";
import { CharacterManager } from "@/components/character-manager";
import { MemberSidebar } from "@/components/member-sidebar";
import { RealmSidebar } from "@/components/realm-sidebar";
import { SiteHeader } from "@/components/site-header";
import { TraitsManager } from "@/components/traits-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
							<Skeleton className="h-32 w-full" />
						</div>
					</main>
					<div className="p-4">
						<MemberSidebar realmId={realmId} />
					</div>
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
					<div className="space-y-6">
						<div>
							<h1 className="font-bold text-2xl">{realm.name}</h1>
							<p className="text-muted-foreground">{realm.description}</p>
						</div>

						<Tabs defaultValue="characters" className="w-full">
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="characters">Characters</TabsTrigger>
								<TabsTrigger value="traits">Traits</TabsTrigger>
								<TabsTrigger value="notes">Notes</TabsTrigger>
							</TabsList>
							<TabsContent value="characters" className="mt-6">
								<div className="rounded-lg border p-4 sm:p-6">
									<CharacterManager realmId={realm.id} />
								</div>
							</TabsContent>
							<TabsContent value="traits" className="mt-6">
								<div className="rounded-lg border p-6">
									<TraitsManager realmId={realm.id} />
								</div>
							</TabsContent>
							<TabsContent value="notes" className="mt-6">
								<div className="rounded-lg border p-6">
									<h3 className="mb-4 font-semibold text-lg">Notes</h3>
									<p className="text-muted-foreground">
										Note management will be implemented here.
									</p>
								</div>
							</TabsContent>
						</Tabs>
					</div>
				</main>
				<div className="">
					<MemberSidebar realmId={realmId} />
				</div>
			</div>
		</div>
	);
}
