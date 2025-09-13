"use client";

import { RealmSidebar } from "@/components/realm-sidebar";
import { SiteHeader } from "@/components/site-header";

export default function RealmsPage() {
	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			<SiteHeader />
			<div className="flex h-full min-h-0">
				<RealmSidebar />
				<main className="flex-1 p-4">
					<div>
						<h1 className="font-bold text-2xl">Select a Realm</h1>
						<p className="text-muted-foreground">
							Choose a realm from the sidebar to get started.
						</p>
						<p className="mt-2 text-muted-foreground sm:hidden">
							On mobile, swipe in from the left edge to open the sidebar.
						</p>
					</div>
				</main>
			</div>
		</div>
	);
}
