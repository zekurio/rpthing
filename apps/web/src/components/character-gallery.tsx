"use client";

import { CharacterCard } from "@/components/character-card";
import type { CharacterListItem } from "@/types";

interface CharacterGalleryProps {
	items: CharacterListItem[];
	onChanged: () => void;
}

export function CharacterGallery({ items, onChanged }: CharacterGalleryProps) {
	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
			{items.map((c) => (
				<CharacterCard key={c.id} character={c} onChanged={onChanged} />
			))}
		</div>
	);
}
