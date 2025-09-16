"use client";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	Download,
	Pencil,
	RotateCcw,
	Trash2,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EditCharacterDialog } from "@/components/edit-character-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { gradeForValue } from "@/lib/traits";
import type { CharacterListItem } from "@/types";
import { queryClient, trpc } from "@/utils/trpc";

interface CharacterCardProps {
	character: CharacterListItem;
	onChanged: () => void;
}

export function CharacterCard({ character, onChanged }: CharacterCardProps) {
	const [open, setOpen] = useState(false);
	const [viewerOpen, setViewerOpen] = useState(false);
	const [scale, setScale] = useState(1);
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const [lastPointer, setLastPointer] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const viewerRef = useRef<HTMLDivElement | null>(null);
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

	const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "";
	const fullImageSrc = `${serverUrl}/api/character/${character.id}/image?raw=1`;

	// Reset zoom/pan when the viewer closes
	useEffect(() => {
		if (!viewerOpen) {
			setScale(1);
			setOffset({ x: 0, y: 0 });
			setIsPanning(false);
			setLastPointer(null);
		}
	}, [viewerOpen]);

	const clampScale = (value: number) => Math.min(5, Math.max(1, value));

	const zoomTo = (newScale: number, anchor: { x: number; y: number }) => {
		const clampedScale = clampScale(newScale);
		const dx = anchor.x - offset.x;
		const dy = anchor.y - offset.y;
		const ratio = clampedScale / scale;
		const newOffset = { x: anchor.x - dx * ratio, y: anchor.y - dy * ratio };
		setOffset(clampedScale === 1 ? { x: 0, y: 0 } : newOffset);
		setScale(clampedScale);
	};

	const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
		if (!character.referenceImageKey) return;
		e.preventDefault();
		const delta = -e.deltaY; // natural: wheel up zooms in
		const zoomIntensity = 0.0015;
		const newScale = clampScale(scale * (1 + delta * zoomIntensity));
		// Keep the point under cursor stable: adjust offset accordingly
		const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
		const cx = e.clientX - rect.left;
		const cy = e.clientY - rect.top;
		const dx = cx - offset.x;
		const dy = cy - offset.y;
		const scaleRatio = newScale / scale;
		setOffset({ x: cx - dx * scaleRatio, y: cy - dy * scaleRatio });
		setScale(newScale);
	};

	const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
		if (!character.referenceImageKey) return;
		setIsPanning(true);
		setLastPointer({ x: e.clientX, y: e.clientY });
	};

	const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
		if (!isPanning || !lastPointer) return;
		const dx = e.clientX - lastPointer.x;
		const dy = e.clientY - lastPointer.y;
		setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
		setLastPointer({ x: e.clientX, y: e.clientY });
	};

	const endPan = () => {
		setIsPanning(false);
		setLastPointer(null);
	};

	const handleDoubleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
		if (!character.referenceImageKey) return;
		const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
		const cx = e.clientX - rect.left;
		const cy = e.clientY - rect.top;
		const targetScale = scale < 2 ? 2 : 1;
		const scaleRatio = targetScale / scale;
		const dx = cx - offset.x;
		const dy = cy - offset.y;
		setOffset({ x: cx - dx * scaleRatio, y: cy - dy * scaleRatio });
		setScale(targetScale);
	};

	const zoomIn = () => {
		const el = viewerRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const center = { x: rect.width / 2, y: rect.height / 2 };
		zoomTo(scale * 1.2, center);
	};
	const zoomOut = () => {
		const el = viewerRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const center = { x: rect.width / 2, y: rect.height / 2 };
		zoomTo(scale / 1.2, center);
	};
	const resetView = () => {
		setScale(1);
		setOffset({ x: 0, y: 0 });
	};

	return (
		<div className="group overflow-hidden rounded-lg border">
			{character.referenceImageKey ? (
				<button
					className="relative aspect-square w-full cursor-pointer bg-muted"
					onClick={() => setViewerOpen(true)}
					aria-label="View full image"
					type="button"
				>
					<Image
						src={character.referenceImageKey}
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
					{character.gender ? (
						<div className="truncate text-muted-foreground text-xs">
							{character.gender}
						</div>
					) : null}
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

			{/* Full image viewer */}
			<Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
				<DialogContent
					showCloseButton={false}
					className="w-[96vw] max-w-none border-0 bg-transparent p-0 shadow-none sm:w-[95vw] sm:max-w-[95vw] md:w-[90vw] md:max-w-[90vw] lg:w-[85vw] lg:max-w-[85vw] xl:w-[80vw] xl:max-w-[80vw]"
				>
					<DialogHeader>
						<VisuallyHidden>
							<DialogTitle>{character.name} full image</DialogTitle>
						</VisuallyHidden>
					</DialogHeader>
					<div
						className="relative h-[90vh] w-full overflow-hidden"
						ref={viewerRef}
						onWheel={handleWheel}
						onMouseDown={handleMouseDown}
						onMouseMove={handleMouseMove}
						onMouseUp={endPan}
						onMouseLeave={endPan}
						onDoubleClick={handleDoubleClick}
						role="img"
						aria-label="Zoomable image viewer"
					>
						{character.referenceImageKey ? (
							<div
								className={"relative h-full w-full"}
								style={{
									transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
									transformOrigin: "0 0",
									cursor: isPanning
										? "grabbing"
										: scale > 1
											? "grab"
											: "default",
								}}
							>
								<Image
									src={fullImageSrc}
									alt={character.name}
									fill
									sizes="100vw"
									className="select-none object-contain"
									unoptimized
									draggable={false}
								/>
							</div>
						) : null}

						{character.referenceImageKey ? (
							<div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-background/80 p-1 shadow">
								<Button
									variant="ghost"
									size="icon"
									onClick={zoomOut}
									aria-label="Zoom out"
								>
									<ZoomOut className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={resetView}
									aria-label="Reset view"
								>
									<RotateCcw className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={zoomIn}
									aria-label="Zoom in"
								>
									<ZoomIn className="h-4 w-4" />
								</Button>
								<a
									href={fullImageSrc}
									download
									target="_blank"
									rel="noopener noreferrer"
									aria-label="Download image"
								>
									<Button asChild variant="ghost" size="icon">
										<span>
											<Download className="h-4 w-4" />
										</span>
									</Button>
								</a>
								<DialogClose asChild>
									<Button variant="ghost" size="icon" aria-label="Close viewer">
										<X className="h-4 w-4" />
									</Button>
								</DialogClose>
							</div>
						) : null}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
