"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { User, Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const CHARACTER_SKELETON_KEYS = Array.from(
	{ length: 4 },
	(_, i) => `character-skeleton-${i}`,
);

function CharacterOverviewSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-2">
			{CHARACTER_SKELETON_KEYS.map((key) => (
				<Skeleton key={key} className="aspect-square w-full rounded-lg" />
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

	// Group characters by realm, showing 4 most recent per realm
	const charactersByRealm = characterQueries
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

	const isLoading = realmsLoading || characterQueries.some((q) => q.isPending);

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
		return charactersByRealm.length === 0 ? (
			<div className="py-12 text-center text-muted-foreground">
				<Users className="mx-auto mb-4 h-16 w-16 opacity-50" />
				<h3 className="mb-2 font-medium text-lg">No characters yet</h3>
				<p className="text-sm">
					Create your first character in one of your realms to get started.
				</p>
			</div>
		) : (
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{charactersByRealm.map((group) => (
					<div key={group.realm?.id}>
						<div className="mb-3 flex items-center gap-2">
							<button
								type="button"
								className="max-w-[calc(100%-40px)] overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-primary/10 px-3 py-1.5 font-semibold text-lg text-primary transition-colors hover:bg-primary/20 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
								style={{ maxWidth: "calc(100% - 40px)" }}
								onClick={() => router.push(`/realms/${group.realm?.id}`)}
								title={group.realm?.name}
							>
								{group.realm?.name}
							</button>
							<div className="flex items-center gap-1 text-muted-foreground text-sm">
								<User className="h-4 w-4" />
								<span>{group.totalCount}</span>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							{group.characters.map((character) => {
								const imageSrc =
									character.croppedImageKey || character.referenceImageKey;
								return (
									<div
										key={character.id}
										className="group overflow-hidden rounded-lg border"
									>
										{imageSrc ? (
											<div className="relative aspect-square w-full bg-muted">
												<Image
													src={imageSrc}
													alt={character.name}
													fill
													className="object-cover"
													sizes="(max-width: 640px) 50vw, 25vw"
													priority={false}
												/>
											</div>
										) : (
											<div className="flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground text-xs">
												No image
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
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
				{charactersByRealm.length === 0 ? (
					<div className="py-12 text-center text-muted-foreground">
						<Users className="mx-auto mb-4 h-16 w-16 opacity-50" />
						<h3 className="mb-2 font-medium text-lg">No characters yet</h3>
						<p className="text-sm">
							Create your first character in one of your realms to get started.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{charactersByRealm.map((group) => (
							<div key={group.realm?.id}>
								<div className="mb-3 flex items-center gap-2">
									<button
										type="button"
										className="whitespace-nowrap rounded-md bg-primary/10 px-3 py-1.5 font-semibold text-lg text-primary transition-colors hover:bg-primary/20 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
										onClick={() => router.push(`/realms/${group.realm?.id}`)}
									>
										{group.realm?.name && group.realm.name.length > 16
											? `${group.realm.name.slice(0, 16)}...`
											: group.realm?.name}
									</button>
									<div className="flex items-center gap-1 text-muted-foreground text-sm">
										<User className="h-4 w-4" />
										<span>{group.totalCount}</span>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									{group.characters.map((character) => {
										const imageSrc =
											character.croppedImageKey || character.referenceImageKey;
										return (
											<div
												key={character.id}
												className="group overflow-hidden rounded-lg border"
											>
												{imageSrc ? (
													<div className="relative aspect-square w-full bg-muted">
														<Image
															src={imageSrc}
															alt={character.name}
															fill
															className="object-cover"
															sizes="(max-width: 640px) 50vw, 25vw"
															priority={false}
														/>
													</div>
												) : (
													<div className="flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground text-xs">
														No image
													</div>
												)}
											</div>
										);
									})}
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
