"use client";

import { useMutation } from "@tanstack/react-query";
import type { Trait } from "@types";
import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
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
import { queryClient, trpc } from "@/lib/trpc";

interface TraitCardProps {
	trait: Trait;
	onEdit: (trait: Trait) => void;
	onDeleted?: () => void;
}

export function TraitCard({ trait, onEdit, onDeleted }: TraitCardProps) {
	const [deleteOpen, setDeleteOpen] = useState(false);

	const deleteMutation = useMutation({
		...trpc.trait.delete.mutationOptions(),
		onSuccess: () => {
			onDeleted?.();
			// Invalidate characters with ratings so UI reflects removal
			queryClient.invalidateQueries({
				predicate: (q) =>
					JSON.stringify(q.queryKey).includes("character.getWithRatings"),
			});
			toast.success("Trait deleted");
			setDeleteOpen(false);
		},
		onError: (err) => toast.error(err.message || "Failed to delete trait"),
	});

	const confirmDelete = useCallback(async () => {
		await deleteMutation.mutateAsync(trait.id);
	}, [deleteMutation, trait.id]);

	return (
		<>
			<div className="flex items-center justify-between gap-3 rounded-md border p-3">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="truncate font-medium">{trait.name}</span>
						<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs uppercase">
							{trait.displayMode}
						</span>
					</div>
					{trait.description && (
						<p className="mt-1 truncate text-muted-foreground text-sm">
							{trait.description}
						</p>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onEdit(trait)}
						aria-label="Edit trait"
					>
						<Pencil className="h-3 w-3" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="text-destructive"
						onClick={() => setDeleteOpen(true)}
						aria-label="Delete trait"
					>
						<Trash2 className="h-3 w-3" />
					</Button>
				</div>
			</div>
			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete trait?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone.
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
		</>
	);
}
