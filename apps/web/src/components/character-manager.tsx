"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { CharacterGallery } from "@/components/character-gallery";
import { CreateCharacterDialog } from "@/components/create-character-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, trpc } from "@/utils/trpc";

export function CharacterManager({ realmId, enabled = true }: { realmId: string; enabled?: boolean }) {
    const { data: characters, isLoading } = useQuery({
        ...trpc.character.list.queryOptions({ realmId }),
        enabled,
    });

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: trpc.character.list.queryKey({ realmId }),
		});
	}, [realmId]);

	const [createOpen, setCreateOpen] = useState(false);
	const [search, setSearch] = useState("");

	const filteredCharacters = useMemo(() => {
		if (!characters) return [];
		const query = search.trim().toLowerCase();
		if (!query) return characters;
		return characters.filter((c) => c.name.toLowerCase().includes(query));
	}, [characters, search]);

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h3 className="font-bold text-xl tracking-tight">Characters</h3>
					<p className="mt-1 text-muted-foreground text-sm">
						{filteredCharacters?.length || 0} character
						{filteredCharacters?.length === 1 ? "" : "s"}
					</p>
				</div>
				<Button
					size="sm"
					onClick={() => setCreateOpen(true)}
					className="shrink-0"
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>
			<Input
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				placeholder="Search characters..."
				aria-label="Search characters"
				className="w-full"
			/>

			{isLoading ? (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
			) : filteredCharacters && filteredCharacters.length > 0 ? (
				<CharacterGallery items={filteredCharacters} onChanged={invalidate} />
			) : (
				<div className="flex min-h-[12rem] flex-col items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed p-8 text-center">
					<div className="mb-4 rounded-full bg-muted p-3">
						<Users className="h-6 w-6 text-muted-foreground" />
					</div>
					<h4 className="mb-1 font-semibold text-sm">
						{search ? "No matching characters" : "No characters yet"}
					</h4>
					<p className="mb-4 max-w-sm text-muted-foreground text-xs">
						{search
							? "Try a different search term."
							: "Create characters to start building your realm's roster."}
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
