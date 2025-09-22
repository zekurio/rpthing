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
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useRealmAccess } from "@/hooks/use-realm-access";
import { getGradeColor, gradeForValue, type TraitGrade } from "@/lib/traits";
import { queryClient, trpc } from "@/utils/trpc";

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

	// Check if user can delete this character (is creator OR is realm owner)
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

	return (
		<div className="group overflow-hidden rounded-lg border border-border">
			{previewSrc ? (
				<div className="relative aspect-square w-full bg-muted">
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
					<div className="absolute top-2 right-2">
						<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
							<DropdownMenuTrigger asChild>
								<Button
									variant="secondary"
									size="sm"
									className="h-8 w-8 rounded-full bg-black/50 p-0 text-white hover:bg-black/70"
									aria-label="Character options"
								>
									<MoreVertical className="h-4 w-4" />
								</Button>
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
				</div>
			) : (
				<div className="relative aspect-square w-full bg-muted">
					<div className="grid h-full w-full place-items-center text-muted-foreground text-xs">
						No image
					</div>
					<div className="absolute top-2 right-2">
						<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
							<DropdownMenuTrigger asChild>
								<Button
									variant="secondary"
									size="sm"
									className="h-8 w-8 rounded-full bg-black/50 p-0 text-white hover:bg-black/70"
									aria-label="Character options"
								>
									<MoreVertical className="h-4 w-4" />
								</Button>
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
			{ratedTraits.length > 0 ? (
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
