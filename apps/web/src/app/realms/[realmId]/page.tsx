"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import NotFound from "@/app/not-found";
import { AppSidebar } from "@/components/app-sidebar";
import { CharacterManager } from "@/components/character-manager";
import { TraitsManager } from "@/components/traits-manager";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealmAccess } from "@/hooks/use-realm-access";

export default function RealmPage() {
	const params = useParams<{ realmId?: string | string[] }>();
	const rawRealm = params?.realmId;
	const realmId = Array.isArray(rawRealm)
		? typeof rawRealm[0] === "string"
			? rawRealm[0]
			: null
		: typeof rawRealm === "string"
			? rawRealm
			: null;

	const { realm, hasAccess, shouldShowNotFound } = useRealmAccess(realmId);

	const [tab, setTab] = useState("characters");
	const [aboutOpen, setAboutOpen] = useState(false);

	// If access is denied, render the not-found page
	if (shouldShowNotFound || !realmId) return <NotFound />;

	if (!hasAccess || !realm) return null;

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<SidebarTrigger />
					<div className="font-semibold">{realm.name}</div>
					{realm.description ? (
						<>
							<div
								className="pointer-events-none mx-2 h-4 w-px bg-border"
								aria-hidden="true"
							/>
							<button
								type="button"
								onClick={() => setAboutOpen(true)}
								className="max-w-[40vw] truncate text-muted-foreground text-xs hover:underline sm:text-sm md:max-w-[50vw]"
								title={realm.description || undefined}
							>
								{realm.description}
							</button>
						</>
					) : null}
				</div>
				<div className="flex h-full min-h-0 w-full flex-col">
					<div className="flex h-full min-h-0 overflow-hidden">
						<main className="flex-1 overflow-y-auto p-6">
							<div className="space-y-6">
								{/* Description moved to header */}

								<Tabs value={tab} onValueChange={setTab} className="w-full">
									<TabsList className="grid w-full grid-cols-2">
										<TabsTrigger value="characters">Characters</TabsTrigger>
										<TabsTrigger value="traits">Traits</TabsTrigger>
									</TabsList>
									<TabsContent value="characters" className="mt-6">
										<CharacterManager
											realmId={realm.id}
											enabled={tab === "characters"}
										/>
									</TabsContent>
									<TabsContent value="traits" className="mt-6">
										<TraitsManager
											realmId={realm.id}
											enabled={tab === "traits"}
										/>
									</TabsContent>
								</Tabs>
							</div>
						</main>
					</div>
				</div>
				<Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{realm.name}</DialogTitle>
							{realm.description ? (
								<DialogDescription className="whitespace-pre-wrap">
									{realm.description}
								</DialogDescription>
							) : null}
						</DialogHeader>
					</DialogContent>
				</Dialog>
			</SidebarInset>
		</SidebarProvider>
	);
}
