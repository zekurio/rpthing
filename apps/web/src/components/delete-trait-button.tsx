"use client";

import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
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
import { queryClient, trpc } from "@/utils/trpc";

interface DeleteTraitButtonProps {
	id: string;
	onDeleted: () => void;
}

export function DeleteTraitButton({ id, onDeleted }: DeleteTraitButtonProps) {
	const [open, setOpen] = useState(false);
	const deleteMutation = useMutation({
		...trpc.trait.delete.mutationOptions(),
		onSuccess: () => {
			onDeleted();
			// Invalidate characters with ratings so UI reflects removal
			queryClient.invalidateQueries({
				predicate: (q) =>
					JSON.stringify(q.queryKey).includes("character.getWithRatings"),
			});
			toast.success("Trait deleted");
			setOpen(false);
		},
		onError: (err) => toast.error(err.message || "Failed to delete trait"),
	});

	const confirmDelete = useCallback(async () => {
		await deleteMutation.mutateAsync(id);
	}, [deleteMutation, id]);

	return (
		<>
			<Button
				variant="ghost"
				size="sm"
				className="text-destructive"
				onClick={() => setOpen(true)}
				aria-label="Delete trait"
			>
				<Trash2 className="h-3 w-3" />
			</Button>
			<AlertDialog open={open} onOpenChange={setOpen}>
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
