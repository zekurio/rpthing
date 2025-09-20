"use client";

import { CharacterCard } from "@/components/character-card";
import type { CharacterListItem } from "@/types";

interface CharacterGalleryProps {
	items: CharacterListItem[];
	onChanged: () => void;
	realmId?: string;
}

export function CharacterGallery({
	items,
	onChanged,
	realmId,
}: CharacterGalleryProps) {
	return (
		<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{items.map((c) => (
				<CharacterCard
					key={c.id}
					character={c}
					onChanged={onChanged}
					realmId={realmId}
				/>
			))}
		</div>
	);
}
