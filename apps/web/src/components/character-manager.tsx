"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
		<div className="grid gap-4">
			<div className="flex items-center justify-between">
				<h3 className="font-semibold text-lg">Characters</h3>
				<Button size="sm" onClick={() => setCreateOpen(true)}>
					<Plus className="mr-1 h-3 w-3" /> New
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
				<div className="rounded-md border p-6 text-center text-muted-foreground text-sm">
					No characters yet. Create your first one.
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
