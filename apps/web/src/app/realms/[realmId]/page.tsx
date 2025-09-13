"use client";

import { useParams } from "next/navigation";
import { RealmSidebar } from "@/components/realm-sidebar";
import { SiteHeader } from "@/components/site-header";

export default function RealmPage() {
	const params = useParams();
	const realmId = params.realmId as string;

	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			<SiteHeader />
			<div className="flex h-full min-h-0">
				<RealmSidebar />
				<main className="flex-1 p-4">
					<div>
						<h1 className="font-bold text-2xl">Realm {realmId}</h1>
						<p className="text-muted-foreground">
							Content for the selected realm will go here.
						</p>
					</div>
				</main>
			</div>
		</div>
	);
}
