"use client";

import { Pencil, Trash2 } from "lucide-react";
import { memo, useState } from "react";

import { EditCharacterDialog } from "@/components/edit-character-dialog";
import { ImageViewer } from	 "@/components/image-viewer";
import { Button } from "@/components/ui/button";
import { gradeForValue } from "@/lib/traits";
import type { CharacterListItem } from "@/types";
import { DeleteCharacterDialog } from "@/components/delete-character-dialog";

interface CharacterCardProps {
	character: CharacterListItem;
	onChanged: () => void;
}

export const CharacterCard = memo(function CharacterCard({
	character,
	onChanged,
}: CharacterCardProps) {
	const [viewerOpen, setViewerOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	

    const ratedTraits =
        character.ratingsSummary?.filter((t) => typeof t.value === "number") ?? [];

	const previewSrc =
		character.croppedImageKey || character.referenceImageKey || undefined;
	const fullImageSrc = character.referenceImageKey || undefined;

	return (
		<div className="group overflow-hidden rounded-lg border">
			{previewSrc ? (
				<button
					className="relative aspect-square w-full cursor-pointer bg-muted"
					onClick={() => setViewerOpen(true)}
					aria-label="View full image"
					type="button"
				>
					<img
						src={previewSrc}
						alt={character.name}
						className="absolute inset-0 h-full w-full object-cover"
						loading="lazy"
					/>
				</button>
			) : (
				<div className="relative aspect-square w-full bg-muted">
					<div className="grid h-full w-full place-items-center text-muted-foreground text-xs">
						No image
					</div>
				</div>
			)}
			<div className="flex items-center justify-between gap-2 p-2">
				<div className="min-w-0">
					<div className="truncate font-medium">{character.name}</div>
					<div className="truncate text-muted-foreground text-xs">
						{character.gender ? (
							<>
								{character.gender}
								{character.ownerName ? " • " : null}
							</>
						) : null}
						{character.ownerName ? `Owner: ${character.ownerName}` : null}
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
					onClick={() => setEditOpen(true)}
						aria-label="Edit character"
					>
						<Pencil className="h-3 w-3" />
					</Button>
				<DeleteCharacterDialog
						id={character.id}
						onDeleted={onChanged}
					/>
				</div>
			</div>
			{ratedTraits.length > 0 ? (
				<div className="flex flex-wrap gap-1 px-2 pb-2">
					{ratedTraits.map((t) => {
						const label =
							t.displayMode === "grade"
								? gradeForValue(t.value as number)
								: String(t.value);
						return (
							<span
								key={t.traitId}
								className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
								title={`${t.traitName}: ${label}`}
							>
								{t.traitName}: {label}
							</span>
						);
					})}
				</div>
			) : null}

			<EditCharacterDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				characterId={character.id}
				onChanged={onChanged}
			/>

			{/* New high-performance image viewer */}
			{fullImageSrc ? (
				<ImageViewer
					open={viewerOpen}
					onOpenChange={setViewerOpen}
					src={fullImageSrc}
					alt={`${character.name} full image`}
					downloadHref={fullImageSrc}
					maxScale={5}
					minScale={1}
				/>
			) : null}
		</div>
	);
});
