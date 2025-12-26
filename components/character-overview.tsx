"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { User, Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { characterQueries, realmQueries } from "@/lib/eden";

const CHARACTER_SKELETON_KEYS = Array.from(
	{ length: 4 },
	(_, i) => `character-skeleton-${i}`,
);

function CharacterOverviewSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3 sm:gap-4">
			{CHARACTER_SKELETON_KEYS.map((key) => (
				<Skeleton key={key} className="aspect-square w-full rounded-xl" />
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
	const router = useRouter();
	const { data: realms, isPending: realmsLoading } = useQuery({
		...realmQueries.list(),
	});

	// Get characters from all realms using useQueries
	const realmIds = realms?.map((realm) => realm.id) || [];
	const characterQueriesResult = useQueries({
		queries: realmIds.map((realmId) => ({
			...characterQueries.list(realmId),
			enabled: !!realmId,
		})),
	});

	// Group characters by realm, showing 4 most recent per realm
	const charactersByRealm = characterQueriesResult
		.map((query, index) => {
			const realmId = realmIds[index];
			const realm = realms?.find((r) => r.id === realmId);
			const allUserCharacters = (query.data || []).filter(
				(c) => !user || c.userId === user.id,
			);

			const characters = allUserCharacters
				.sort((a, b) => {
					// Sort by most recently updated
					const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
					const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
					return bDate - aDate;
				})
				.slice(0, 4); // Show only the 4 most recent per realm

			return {
				realm,
				characters,
				totalCount: allUserCharacters.length,
			};
		})
		.filter((group) => group.characters.length > 0 && group.realm);

	const isLoading =
		realmsLoading || characterQueriesResult.some((q) => q.isPending);

	if (isLoading) {
		if (unstyled) {
			return <CharacterOverviewSkeleton />;
		}
		return (
			<Card className="border-muted/50 shadow-sm">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-xl">
						<Users className="h-5 w-5 text-primary" />
						Recent Characters
					</CardTitle>
				</CardHeader>
				<CardContent>
					<CharacterOverviewSkeleton />
				</CardContent>
			</Card>
		);
	}

	const EmptyState = () => (
		<div className="py-16 text-center text-muted-foreground md:py-20">
			<Users className="mx-auto mb-4 h-20 w-20 opacity-30 md:h-24 md:w-24" />
			<h3 className="mb-2 font-semibold text-base md:text-lg">
				No characters yet
			</h3>
			<p className="text-muted-foreground/80 text-sm">
				Create your first character in one of your realms to get started.
			</p>
		</div>
	);

	const CharacterCard = ({
		character,
		realmId,
	}: {
		character: (typeof charactersByRealm)[number]["characters"][number];
		realmId: string;
	}) => {
		const displaySrc = character.croppedImageKey || character.referenceImageKey;

		return (
			<button
				type="button"
				onClick={() => {
					router.push(`/characters?realm=${realmId}`);
				}}
				className="group relative aspect-square w-full overflow-hidden border border-border bg-muted transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
			>
				{displaySrc ? (
					<>
						<div className="relative h-full w-full">
							<Image
								src={displaySrc}
								alt={character.name}
								fill
								className="object-cover transition-transform duration-300 group-hover:scale-105"
								sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
								priority={false}
							/>
						</div>
						{/* Character name overlay */}
						<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pt-8 pb-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
							<p className="truncate font-semibold text-sm text-white sm:text-base">
								{character.name}
							</p>
						</div>
					</>
				) : (
					<div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
						<User className="h-8 w-8 opacity-50" />
						<p className="px-2 text-center font-medium text-xs">
							{character.name}
						</p>
						<p className="text-muted-foreground/60 text-xs">No image</p>
					</div>
				)}
			</button>
		);
	};

	const Content = () =>
		charactersByRealm.length === 0 ? (
			<EmptyState />
		) : (
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
				{charactersByRealm.map((group) => (
					<div key={group.realm?.id} className="space-y-3">
						<div className="flex items-center justify-between gap-2">
							<button
								type="button"
								className="group/realm flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-primary/10 px-4 py-2 text-left font-bold text-base text-primary transition-all duration-200 hover:bg-primary/20 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:text-lg"
								onClick={() => {
									if (group.realm?.id) {
										router.push(`/characters?realm=${group.realm.id}`);
									}
								}}
								title={group.realm?.name}
							>
								<span className="flex items-center gap-2">
									{group.realm?.name}
									<span className="opacity-0 transition-opacity group-hover/realm:opacity-100">
										→
									</span>
								</span>
							</button>
							<div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-muted-foreground text-sm">
								<User className="h-4 w-4" />
								<span className="font-medium">{group.totalCount}</span>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3 sm:gap-4">
							{group.characters.map((character) => (
								<CharacterCard
									key={character.id}
									character={character}
									realmId={group.realm?.id ?? ""}
								/>
							))}
						</div>
					</div>
				))}
			</div>
		);

	if (unstyled) {
		return <Content />;
	}

	return (
		<Card className="border-muted/50 shadow-sm">
			<CardHeader className="border-border/50 border-b bg-muted/30">
				<CardTitle className="flex items-center gap-2 text-xl">
					<Users className="h-5 w-5 text-primary" />
					Recent Characters
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-6">
				<Content />
			</CardContent>
		</Card>
	);
}
