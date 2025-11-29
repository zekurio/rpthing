"use client";

import { useQueries } from "@tanstack/react-query";
import { Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { RealmItem } from "@/components/realm-item";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

type Realm = {
	id: string;
	name?: string;
	iconKey?: string | null;
	ownerId?: string;
	memberCount?: number;
};

export function SidebarRealmList({
	realms,
	currentRealmFilter,
	isPending = false,
	currentUserId,
	onDelete,
	onLeave,
	onSettings,
}: {
	realms: Realm[];
	currentRealmFilter?: string | null;
	isPending?: boolean;
	currentUserId?: string;
	onDelete: (realmId: string) => void;
	onLeave: (realmId: string) => void;
	onSettings: (realmId: string) => void;
}) {
	// All hooks must be called at the top level, before any early returns
	const { user } = useAuth();

	// Fetch character counts for all realms
	const characterQueries = useQueries({
		queries: (realms || []).map((realm) => ({
			...trpc.character.list.queryOptions({ realmId: realm.id }),
			enabled: !!realm.id && !isPending && realms.length > 0,
		})),
	});

	// Calculate character counts per realm (only user's own characters)
	const characterCountsByRealm = useMemo(() => {
		const counts: Record<string, number> = {};
		if (!realms || realms.length === 0) return counts;
		characterQueries.forEach((query, index) => {
			const realmId = realms[index]?.id;
			if (realmId && query.data) {
				counts[realmId] = query.data.filter(
					(c) => !user || c.userId === user.id,
				).length;
			}
		});
		return counts;
	}, [characterQueries, realms, user]);

	// Calculate total character count
	const totalCharacterCount = useMemo(() => {
		return Object.values(characterCountsByRealm).reduce(
			(sum, count) => sum + count,
			0,
		);
	}, [characterCountsByRealm]);

	// Now we can have early returns after all hooks have been called
	if (isPending) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<div className="flex items-center gap-3 rounded-md p-2">
						<div className="size-6 rounded-lg bg-accent" />
						<span className="h-4 w-24 rounded bg-accent" />
					</div>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	// Handle empty realms gracefully
	if (!realms || realms.length === 0) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<div className="flex items-center gap-3 rounded-md p-2 text-muted-foreground">
						<span className="text-sm">No realms yet</span>
					</div>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	function AllCharactersItem() {
		const pathname = usePathname();
		const searchParams = useSearchParams();
		const isActive = pathname === "/characters" && !searchParams?.get("realm");

		return (
			<SidebarMenuItem>
				<div
					className={`group relative w-full rounded-md transition-colors hover:bg-accent ${isActive ? "bg-accent" : ""}`}
				>
					<Button
						variant="ghost"
						className="h-auto w-full justify-start gap-3 p-2"
						asChild
					>
						<Link href="/characters">
							<Avatar className="h-8 w-8 shrink-0">
								<AvatarFallback className="bg-primary/10 text-primary">
									<Users className="h-4 w-4" />
								</AvatarFallback>
							</Avatar>
							<span className="truncate font-medium text-sm">
								All Characters
							</span>
							{totalCharacterCount > 0 && (
								<span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
									{totalCharacterCount}
								</span>
							)}
						</Link>
					</Button>
				</div>
			</SidebarMenuItem>
		);
	}

	return (
		<SidebarMenu>
			<AllCharactersItem />
			{realms.map((realm) => {
				const isSelected = currentRealmFilter === realm.id;
				const isOwner = Boolean(
					currentUserId && realm.ownerId === currentUserId,
				);
				const characterCount = characterCountsByRealm[realm.id];
				return (
					<SidebarMenuItem key={realm.id}>
						<RealmItem
							realm={realm}
							isSelected={isSelected}
							isOwner={isOwner}
							onDelete={onDelete}
							onLeave={onLeave}
							onSettings={onSettings}
							characterCount={characterCount}
						/>
					</SidebarMenuItem>
				);
			})}
		</SidebarMenu>
	);
}
