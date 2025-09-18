"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { Activity, Crown, Eye, Sword, Users } from "lucide-react";
// Removed next/image
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

interface RealmOverviewCardProps {
	realm: {
		id: string;
		name: string;
		description: string | null;
		iconKey: string | null;
		ownerId: string;
		createdAt: string;
		updatedAt: string;
	};
	memberCount: number;
	characterCount: number;
	traitCount: number;
	isOwner: boolean;
	recentActivity: number; // Number of recent updates
}

function RealmOverviewCard({
	realm,
	memberCount,
	characterCount,
	traitCount,
	isOwner,
	recentActivity,
}: RealmOverviewCardProps) {
	const getActivityLevel = (count: number) => {
		if (count === 0)
			return { level: "Inactive", color: "text-muted-foreground" };
		if (count < 3) return { level: "Low", color: "text-blue-500" };
		if (count < 10) return { level: "Medium", color: "text-yellow-500" };
		return { level: "High", color: "text-green-500" };
	};

	const activity = getActivityLevel(recentActivity);

	return (
		<Card className="group overflow-hidden transition-shadow hover:shadow-md">
			<div className="relative aspect-square bg-muted">
				{realm.iconKey ? (
					<img
						src={realm.iconKey}
						alt={realm.name}
						className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
						loading="lazy"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center text-muted-foreground">
						<Crown className="h-16 w-16" />
					</div>
				)}
				{isOwner && (
					<div className="absolute top-2 right-2">
						<Badge variant="secondary" className="text-xs">
							Owner
						</Badge>
					</div>
				)}
			</div>
			<CardContent className="p-4">
				<div className="space-y-3">
					<div>
						<h3 className="flex items-center gap-2 truncate font-semibold">
							{realm.name}
							{isOwner && <Crown className="h-4 w-4 text-yellow-500" />}
						</h3>
						{realm.description && (
							<p className="line-clamp-2 text-muted-foreground text-sm">
								{realm.description}
							</p>
						)}
					</div>

					<div className="grid grid-cols-3 gap-2 text-center">
						<div className="flex flex-col items-center">
							<Users className="mb-1 h-4 w-4 text-muted-foreground" />
							<span className="font-semibold text-lg">{memberCount}</span>
							<span className="text-muted-foreground text-xs">Members</span>
						</div>
						<div className="flex flex-col items-center">
							<Sword className="mb-1 h-4 w-4 text-muted-foreground" />
							<span className="font-semibold text-lg">{characterCount}</span>
							<span className="text-muted-foreground text-xs">Characters</span>
						</div>
						<div className="flex flex-col items-center">
							<Activity className="mb-1 h-4 w-4 text-muted-foreground" />
							<span className="font-semibold text-lg">{traitCount}</span>
							<span className="text-muted-foreground text-xs">Traits</span>
						</div>
					</div>

					<div className="flex items-center justify-between pt-2">
						<div className="flex items-center gap-2">
							<Activity className="h-3 w-3" />
							<span className={`font-medium text-xs ${activity.color}`}>
								{activity.level} Activity
							</span>
						</div>
						<Button asChild size="sm" variant="outline">
							<Link href={`/realms/${realm.id}`}>
								<Eye className="mr-1 h-3 w-3" />
								Open
							</Link>
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

const REALM_SKELETON_KEYS = Array.from(
	{ length: 6 },
	(_, i) => `realm-skeleton-${i}`,
);

function RealmOverviewSkeleton() {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{REALM_SKELETON_KEYS.map((key) => (
				<Card key={key}>
					<Skeleton className="aspect-square w-full" />
					<div className="space-y-3 p-4">
						<div>
							<Skeleton className="mb-2 h-5 w-3/4" />
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-3 w-2/3" />
						</div>
						<div className="grid grid-cols-3 gap-2">
							{[0, 1, 2].map((j) => (
								<div
									key={`realm-skeleton-stat-${key}-${j}`}
									className="flex flex-col items-center"
								>
									<Skeleton className="mb-1 h-4 w-4" />
									<Skeleton className="mb-1 h-5 w-6" />
									<Skeleton className="h-3 w-12" />
								</div>
							))}
						</div>
						<div className="flex items-center justify-between pt-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-8 w-16" />
						</div>
					</div>
				</Card>
			))}
		</div>
	);
}

export function RealmOverview() {
	const { data: realms, isPending: realmsLoading } = useQuery({
		...trpc.realm.list.queryOptions(),
	});

	// Get member counts for each realm using useQueries
	const realmIds = realms?.map((realm) => realm.id) || [];
	const memberQueries = useQueries({
		queries: realmIds.map((realmId) => ({
			...trpc.realm.getMembers.queryOptions({ realmId }),
			enabled: !!realmId,
		})),
	});

	// Get character counts for each realm using useQueries
	const characterQueries = useQueries({
		queries: realmIds.map((realmId) => ({
			...trpc.character.list.queryOptions({ realmId }),
			enabled: !!realmId,
		})),
	});

	// Get trait counts for each realm using useQueries
	const traitQueries = useQueries({
		queries: realmIds.map((realmId) => ({
			...trpc.trait.list.queryOptions({ realmId }),
			enabled: !!realmId,
		})),
	});

	const isLoading =
		realmsLoading ||
		memberQueries.some((q) => q.isPending) ||
		characterQueries.some((q) => q.isPending) ||
		traitQueries.some((q) => q.isPending);

	// Combine data for each realm
	const realmsWithStats = realms?.map((realm, index) => {
		const members = memberQueries[index]?.data || [];
		const characters = characterQueries[index]?.data || [];
		const traits = traitQueries[index]?.data || [];

		// Calculate recent activity (simple heuristic: updates in last 7 days)
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const recentCharacterUpdates = characters.filter(
			(char) => char.updatedAt && new Date(char.updatedAt) > sevenDaysAgo,
		).length;

		const recentTraitUpdates = traits.filter(
			(trait) => trait.updatedAt && new Date(trait.updatedAt) > sevenDaysAgo,
		).length;

		const recentActivity = recentCharacterUpdates + recentTraitUpdates;

		return {
			...realm,
			memberCount: members.length,
			characterCount: characters.length,
			traitCount: traits.length,
			isOwner: members.some(
				(member) => member.userId === realm.ownerId && member.role === "owner",
			),
			recentActivity,
		};
	});

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Crown className="h-5 w-5" />
						Your Realms
					</CardTitle>
				</CardHeader>
				<CardContent>
					<RealmOverviewSkeleton />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Crown className="h-5 w-5" />
					Your Realms
				</CardTitle>
			</CardHeader>
			<CardContent>
				{!realmsWithStats || realmsWithStats.length === 0 ? (
					<div className="py-12 text-center text-muted-foreground">
						<Crown className="mx-auto mb-4 h-16 w-16 opacity-50" />
						<h3 className="mb-2 font-medium text-lg">No realms yet</h3>
						<p className="text-sm">
							Create your first realm to get started with character management.
						</p>
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{realmsWithStats.map((realm) => (
							<RealmOverviewCard
								key={realm.id}
								realm={realm}
								memberCount={realm.memberCount}
								characterCount={realm.characterCount}
								traitCount={realm.traitCount}
								isOwner={realm.isOwner}
								recentActivity={realm.recentActivity}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
