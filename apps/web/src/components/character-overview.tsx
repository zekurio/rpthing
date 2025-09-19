"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { CharacterCard } from "@/components/character-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import type { CharacterListItem } from "@/types";
import { trpc } from "@/utils/trpc";

const CHARACTER_SKELETON_KEYS = Array.from(
	{ length: 8 },
	(_, i) => `character-skeleton-${i}`,
);

function CharacterOverviewSkeleton() {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{CHARACTER_SKELETON_KEYS.map((key) => (
				<div key={key} className="group overflow-hidden rounded-lg border">
					<Skeleton className="aspect-square w-full" />
					<div className="flex items-center justify-between gap-2 p-2">
						<div className="min-w-0">
							<Skeleton className="mb-1 h-4 w-20" />
							<Skeleton className="h-3 w-16" />
						</div>
						<div className="flex shrink-0 items-center gap-1">
							<Skeleton className="h-6 w-6" />
							<Skeleton className="h-6 w-6" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

interface CharacterOverviewProps {
	unstyled?: boolean;
}

export function CharacterOverview({
	unstyled = false,
}: CharacterOverviewProps) {
	const { user } = useAuth();
	const { data: realms, isPending: realmsLoading } = useQuery({
		...trpc.realm.list.queryOptions(),
	});

	// Get characters from all realms using useQueries
	const realmIds = realms?.map((realm) => realm.id) || [];
	const characterQueries = useQueries({
		queries: realmIds.map((realmId) => ({
			...trpc.character.list.queryOptions({ realmId }),
			enabled: !!realmId,
		})),
	});

	const allCharacters: CharacterListItem[] = characterQueries
		.flatMap((query) => query.data || [])
		// Show only characters owned by the current user
		.filter((c) => !user || c.ownerId === user.id)
		.sort((a, b) => {
			// Sort by most recently updated
			const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
			const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
			return bDate - aDate;
		})
		.slice(0, 8); // Show only the 8 most recent

	const isLoading = realmsLoading || characterQueries.some((q) => q.isPending);

	// Handle character changes (for invalidating queries)
	const handleCharacterChanged = () => {
		// Invalidate the character queries to refresh the data
		characterQueries.forEach((query) => {
			query.refetch();
		});
	};

	if (isLoading) {
		if (unstyled) {
			return <CharacterOverviewSkeleton />;
		}
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Recent Characters
					</CardTitle>
				</CardHeader>
				<CardContent>
					<CharacterOverviewSkeleton />
				</CardContent>
			</Card>
		);
	}

	if (unstyled) {
		return allCharacters.length === 0 ? (
			<div className="py-12 text-center text-muted-foreground">
				<Users className="mx-auto mb-4 h-16 w-16 opacity-50" />
				<h3 className="mb-2 font-medium text-lg">No characters yet</h3>
				<p className="text-sm">
					Create your first character in one of your realms to get started.
				</p>
			</div>
		) : (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{allCharacters.map((character) => (
					<CharacterCard
						key={character.id}
						character={character}
						onChanged={handleCharacterChanged}
					/>
				))}
			</div>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Users className="h-5 w-5" />
					Recent Characters
				</CardTitle>
			</CardHeader>
			<CardContent>
				{allCharacters.length === 0 ? (
					<div className="py-12 text-center text-muted-foreground">
						<Users className="mx-auto mb-4 h-16 w-16 opacity-50" />
						<h3 className="mb-2 font-medium text-lg">No characters yet</h3>
						<p className="text-sm">
							Create your first character in one of your realms to get started.
						</p>
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{allCharacters.map((character) => (
							<CharacterCard
								key={character.id}
								character={character}
								onChanged={handleCharacterChanged}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
