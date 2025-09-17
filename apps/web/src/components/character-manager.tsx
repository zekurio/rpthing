"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { CharacterGallery } from "@/components/character-gallery";
import { CreateCharacterDialog } from "@/components/create-character-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, trpc } from "@/utils/trpc";

export function CharacterManager({ realmId }: { realmId: string }) {
	const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
	if (!serverUrl) {
		throw new Error("NEXT_PUBLIC_SERVER_URL is not defined");
	}
	const { data: characters, isLoading } = useQuery({
		...trpc.character.list.queryOptions({ realmId }),
	});

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: trpc.character.list.queryKey({ realmId }),
		});
	}, [realmId]);

	const [createOpen, setCreateOpen] = useState(false);

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h3 className="font-bold text-xl tracking-tight">Characters</h3>
					<p className="mt-1 text-muted-foreground text-sm">
						{characters?.length || 0} character
						{characters?.length === 1 ? "" : "s"}
					</p>
				</div>
				<Button
					size="sm"
					onClick={() => setCreateOpen(true)}
					className="shrink-0"
				>
					<Plus className="mr-2 h-4 w-4" />
					Add Character
				</Button>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
					{[
						"skeleton-1",
						"skeleton-2",
						"skeleton-3",
						"skeleton-4",
						"skeleton-5",
						"skeleton-6",
					].map((key) => (
						<Skeleton key={key} className="aspect-[3/4] w-full rounded-lg" />
					))}
				</div>
			) : characters && characters.length > 0 ? (
				<CharacterGallery items={characters} onChanged={invalidate} />
			) : (
				<div className="flex min-h-[12rem] flex-col items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed p-8 text-center">
					<div className="mb-4 rounded-full bg-muted p-3">
						<Users className="h-6 w-6 text-muted-foreground" />
					</div>
					<h4 className="mb-1 font-semibold text-sm">No characters yet</h4>
					<p className="mb-4 max-w-sm text-muted-foreground text-xs">
						Create characters to start building your realm's roster.
					</p>
				</div>
			)}

			<CreateCharacterDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				realmId={realmId}
				onCreated={invalidate}
			/>
		</div>
	);
}

export default CharacterManager;
