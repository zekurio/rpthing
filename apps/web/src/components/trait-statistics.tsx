"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { BarChart3, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { gradeForValue } from "@/lib/traits";
import { trpc } from "@/utils/trpc";

interface TraitStat {
	traitId: string;
	traitName: string;
	displayMode: "number" | "grade";
	realmName: string;
	ratingCount: number;
	averageRating: number;
	minRating: number;
	maxRating: number;
}

function TraitStatCard({ trait }: { trait: TraitStat }) {
	const averageDisplay =
		trait.displayMode === "grade"
			? gradeForValue(Math.round(trait.averageRating))
			: trait.averageRating.toFixed(1);

	const usagePercentage = Math.min((trait.ratingCount / 20) * 100, 100); // Assuming max 20 ratings for percentage

	return (
		<div className="flex items-center justify-between rounded-lg border bg-card p-3">
			<div className="min-w-0 flex-1">
				<div className="mb-1 flex items-center gap-2">
					<h4 className="truncate font-medium">{trait.traitName}</h4>
					<Badge variant="outline" className="shrink-0 text-xs">
						{trait.displayMode}
					</Badge>
				</div>
				<div className="flex items-center gap-4 text-muted-foreground text-sm">
					<span>{trait.ratingCount} ratings</span>
					<span>Avg: {averageDisplay}</span>
					<span className="text-xs">{trait.realmName}</span>
				</div>
				<Progress value={usagePercentage} className="mt-2 h-1" />
			</div>
		</div>
	);
}

export function TraitStatistics() {
	const { data: realms, isPending: realmsLoading } = useQuery({
		...trpc.realm.list.queryOptions(),
	});

	// Get all characters with ratings from all realms using useQueries
	const realmIds = realms?.map((realm) => realm.id) || [];
	const characterQueries = useQueries({
		queries: realmIds.map((realmId) => ({
			...trpc.character.list.queryOptions({ realmId }),
			enabled: !!realmId,
		})),
	});

	const allCharacters = characterQueries.flatMap((query) => query.data || []);

	// Get ratings for all characters
	const ratingQueries = useQueries({
		queries: allCharacters.map((char) => ({
			...trpc.character.getWithRatings.queryOptions({ id: char.id }),
			enabled: !!char.id,
		})),
	});

	const isLoading =
		realmsLoading ||
		characterQueries.some((q) => q.isPending) ||
		ratingQueries.some((q) => q.isPending);

	// Calculate trait statistics
	const traitStats: TraitStat[] = [];

	if (!isLoading) {
		const traitMap = new Map<string, TraitStat>();

		ratingQueries.forEach((query) => {
			if (query.data?.traits) {
				query.data.traits.forEach((trait) => {
					if (trait.value !== null) {
						const key = `${trait.traitId}-${query.data?.realmId}`;
						const existing = traitMap.get(key);

						if (existing) {
							existing.ratingCount += 1;
							existing.averageRating =
								(existing.averageRating * (existing.ratingCount - 1) +
									trait.value) /
								existing.ratingCount;
							existing.minRating = Math.min(existing.minRating, trait.value);
							existing.maxRating = Math.max(existing.maxRating, trait.value);
						} else {
							traitMap.set(key, {
								traitId: trait.traitId,
								traitName: trait.traitName,
								displayMode: trait.displayMode,
								realmName:
									realms?.find((r) => r.id === query.data?.realmId)?.name ||
									"Unknown",
								ratingCount: 1,
								averageRating: trait.value,
								minRating: trait.value,
								maxRating: trait.value,
							});
						}
					}
				});
			}
		});

		// Convert to array and sort by rating count (most used first)
		traitStats.push(
			...Array.from(traitMap.values()).sort(
				(a, b) => b.ratingCount - a.ratingCount,
			),
		);
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BarChart3 className="h-5 w-5" />
						Trait Statistics
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{[
						"ts-skel-1",
						"ts-skel-2",
						"ts-skel-3",
						"ts-skel-4",
						"ts-skel-5",
					].map((key) => (
						<div key={key} className="rounded-lg border p-3">
							<div className="mb-2 flex items-center gap-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-5 w-12" />
							</div>
							<div className="mb-2 flex gap-4">
								<Skeleton className="h-3 w-16" />
								<Skeleton className="h-3 w-16" />
								<Skeleton className="h-3 w-20" />
							</div>
							<Skeleton className="h-1 w-full" />
						</div>
					))}
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<BarChart3 className="h-5 w-5" />
					Trait Statistics
				</CardTitle>
			</CardHeader>
			<CardContent>
				{traitStats.length === 0 ? (
					<div className="py-12 text-center text-muted-foreground">
						<Target className="mx-auto mb-4 h-16 w-16 opacity-50" />
						<h3 className="mb-2 font-medium text-lg">No trait data yet</h3>
						<p className="text-sm">
							Start rating your characters with traits to see statistics here.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{traitStats.slice(0, 10).map((trait) => (
							<TraitStatCard
								key={`${trait.traitId}-${trait.realmName}`}
								trait={trait}
							/>
						))}
						{traitStats.length > 10 && (
							<div className="pt-4 text-center text-muted-foreground text-sm">
								And {traitStats.length - 10} more traits...
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
