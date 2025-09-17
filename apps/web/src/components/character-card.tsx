"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { memo, useEffect, useRef, useState } from "react";

// Custom throttle hook for smooth animations
function _useThrottle<T>(value: T, delay: number): T {
	const [throttledValue, setThrottledValue] = useState<T>(value);
	const lastExecuted = useRef<number>(Date.now());

	useEffect(() => {
		if (Date.now() >= lastExecuted.current + delay) {
			lastExecuted.current = Date.now();
			setThrottledValue(value);
		} else {
			const timer = setTimeout(() => {
				lastExecuted.current = Date.now();
				setThrottledValue(value);
			}, delay);

			return () => clearTimeout(timer);
		}
	}, [value, delay]);

	return throttledValue;
}

import { toast } from "sonner";
import { EditCharacterDialog } from "@/components/edit-character-dialog";
import { ImageViewer } from "@/components/image-viewer";
import { Button } from "@/components/ui/button";
import { gradeForValue } from "@/lib/traits";
import type { CharacterListItem } from "@/types";
import { queryClient, trpc } from "@/utils/trpc";

interface CharacterCardProps {
	character: CharacterListItem;
	onChanged: () => void;
}

export const CharacterCard = memo(function CharacterCard({
	character,
	onChanged,
}: CharacterCardProps) {
	const [open, setOpen] = useState(false);
	const [viewerOpen, setViewerOpen] = useState(false);
	const del = useMutation({
		...trpc.character.delete.mutationOptions(),
		onSuccess: () => {
			toast.success("Character deleted");
			onChanged();
			setOpen(false);
		},
		onError: (e) => toast.error(e.message || "Failed to delete"),
	});

	const { data: withRatings } = useQuery({
		...trpc.character.getWithRatings.queryOptions({ id: character.id }),
	});
	const ratedTraits =
		withRatings?.traits?.filter((t) => typeof t.value === "number") ?? [];

	// Subscribe to the realm trait list and invalidate character ratings when traits change
	const realmId = withRatings?.realmId;
	const { data: traitSnapshot } = useQuery({
		...trpc.trait.list.queryOptions({ realmId: (realmId ?? "") as string }),
		enabled: !!realmId,
	});
	useEffect(() => {
		if (!realmId) return;
		if (traitSnapshot) {
			queryClient.invalidateQueries({
				queryKey: trpc.character.getWithRatings.queryKey({ id: character.id }),
			});
		}
	}, [realmId, traitSnapshot, character.id]);

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
					<Image
						src={previewSrc}
						alt={character.name}
						fill
						sizes="(max-width:640px) 45vw, (max-width:1024px) 18vw, 12vw"
						className="object-cover"
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
						onClick={() => setOpen(true)}
						aria-label="Edit character"
					>
						<Pencil className="h-3 w-3" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="text-destructive"
						onClick={() => del.mutate({ id: character.id })}
						disabled={del.isPending}
						aria-label="Delete character"
					>
						<Trash2 className="h-3 w-3" />
					</Button>
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
				open={open}
				onOpenChange={setOpen}
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
