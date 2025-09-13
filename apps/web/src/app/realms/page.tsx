"use client";

import { RealmSidebar } from "@/components/realm-sidebar";
import { SiteHeader } from "@/components/site-header";

export default function RealmsPage() {
	return (
		<div className="flex min-h-screen w-full flex-col">
			<SiteHeader />
			<div className="flex flex-1">
				<RealmSidebar />
				<main className="flex-1 p-4">
					<div>
						<h1 className="font-bold text-2xl">Select a Realm</h1>
						<p className="text-muted-foreground">
							Choose a realm from the sidebar to get started.
						</p>
					</div>
				</main>
			</div>
		</div>
	);
}
