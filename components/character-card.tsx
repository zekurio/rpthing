"use client";

import { useMutation } from "@tanstack/react-query";
import type { CharacterListItem } from "@types";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { memo, useCallback, useState } from "react";
import { toast } from "sonner";
import { EditCharacterDialog } from "@/components/edit-character-dialog";
import { ImageViewer } from "@/components/image-viewer";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useRealmAccess } from "@/hooks/use-realm-access";
import { getGradeColor, gradeForValue, type TraitGrade } from "@/lib/traits";
import { queryClient, trpc } from "@/lib/trpc";

interface CharacterCardProps {
	character: CharacterListItem;
	onChanged: () => void;
	realmId?: string;
}

export const CharacterCard = memo(function CharacterCard({
	character,
	onChanged,
	realmId: propRealmId,
}: CharacterCardProps) {
	const [viewerOpen, setViewerOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const { user } = useAuth();
	const realmId = propRealmId || character.realmId;
	const { realm } = useRealmAccess(realmId);

	// Determine if user can delete this character
	const canDelete =
		user && (character.userId === user.id || realm?.ownerId === user.id);

	const deleteMutation = useMutation({
		...trpc.character.delete.mutationOptions(),
		onSuccess: () => {
			onChanged();
			queryClient.invalidateQueries({
				queryKey: trpc.character.list.queryKey(),
			});
			toast.success("Character deleted");
			setDeleteOpen(false);
		},
		onError: (err) => toast.error(err.message || "Failed to delete character"),
	});

	const confirmDelete = useCallback(async () => {
		await deleteMutation.mutateAsync({ id: character.id });
	}, [deleteMutation, character.id]);

	const handleEditClick = useCallback(() => {
		setDropdownOpen(false);
		setEditOpen(true);
	}, []);

	const handleDeleteClick = useCallback(() => {
		setDropdownOpen(false);
		setDeleteOpen(true);
	}, []);

	const ratedTraits =
		character.ratingsSummary
			?.filter((t) => typeof t.value === "number")
			.sort((a, b) => a.traitName.localeCompare(b.traitName)) ?? [];

	const previewSrc =
		character.croppedImageKey || character.referenceImageKey || undefined;
	const fullImageSrc = character.referenceImageKey || undefined;

	const OptionsMenu = (
		<div className="absolute top-2 right-2">
			<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
				<DropdownMenuTrigger asChild>
					{/* biome-ignore lint/a11y/useSemanticElements: Using div to avoid button nesting issues */}
					<div
						role="button"
						tabIndex={0}
						className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-black/70 text-white transition-colors hover:bg-black/80"
						aria-label="Character options"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.stopPropagation();
							}
						}}
					>
						<MoreVertical className="h-4 w-4" />
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={handleEditClick}>
						<Pencil className="mr-2 h-4 w-4" />
						Edit
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={handleDeleteClick}
						className="text-destructive focus:text-destructive"
						disabled={!canDelete}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);

	return (
		<div className="group overflow-hidden rounded-lg border border-border">
			{previewSrc ? (
				<div className="relative aspect-square w-full overflow-hidden bg-muted">
					<button
						className="absolute inset-0 h-full w-full cursor-pointer"
						onClick={() => setViewerOpen(true)}
						aria-label="View full image"
						type="button"
					>
						<Image
							src={previewSrc}
							alt={character.name}
							fill
							className="object-cover"
							sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
							priority={false}
						/>
					</button>
					{OptionsMenu}
				</div>
			) : (
				<div className="relative aspect-square w-full bg-muted">
					<div className="grid h-full w-full place-items-center text-muted-foreground text-xs">
						No image
					</div>
					{OptionsMenu}
				</div>
			)}

			<div className="p-2">
				<div className="min-w-0">
					<div className="truncate font-medium">{character.name}</div>
					<div className="truncate text-muted-foreground text-xs">
						{character.gender ? (
							<>
								{character.gender}
								{character.userName ? " • " : null}
							</>
						) : null}
						{character.userName ? `Created by: ${character.userName}` : null}
					</div>
				</div>
			</div>

			{ratedTraits.length > 0 && (
				<div className="flex flex-wrap gap-1 px-2 pb-2">
					{ratedTraits.map((t) => {
						const label =
							t.displayMode === "grade"
								? gradeForValue(t.value as number)
								: String(t.value);
						const badgeColor =
							t.displayMode === "grade"
								? getGradeColor(label as TraitGrade)
								: "bg-gray-100 text-gray-800 border-gray-200";
						return (
							<span
								key={t.traitId}
								className={`rounded-full border px-2 py-0.5 font-medium text-[11px] ${badgeColor}`}
								title={`${t.traitName}: ${label}`}
							>
								{t.traitName}: {label}
							</span>
						);
					})}
				</div>
			)}

			<EditCharacterDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				characterId={character.id}
				onChanged={onChanged}
			/>

			{fullImageSrc && (
				<ImageViewer
					open={viewerOpen}
					onOpenChange={setViewerOpen}
					src={fullImageSrc}
					alt={`${character.name} full image`}
					downloadHref={fullImageSrc}
					maxScale={5}
					minScale={1}
				/>
			)}

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Character</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this character? This action cannot
							be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
});
