"use client";

import { AlertDialogContent } from "@/components/ui/alert-dialog";
import { AlertDialogHeader } from "@/components/ui/alert-dialog";
import { AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertDialogDescription } from "@/components/ui/alert-dialog";
import { AlertDialogFooter } from "@/components/ui/alert-dialog";
import { AlertDialogCancel } from "@/components/ui/alert-dialog";
import { AlertDialogAction } from "@/components/ui/alert-dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteCharacterDialogProps {
    id: string;
    onDeleted: () => void;
}

export function DeleteCharacterDialog({ id, onDeleted }: DeleteCharacterDialogProps) {
    const [open, setOpen] = useState(false);
    const deleteMutation = useMutation({
        ...trpc.character.delete.mutationOptions(),
        onSuccess: () => {
            onDeleted();
            queryClient.invalidateQueries({ queryKey: trpc.character.list.queryKey() });
            toast.success("Character deleted");
            setOpen(false);
        },
        onError: (err) => toast.error(err.message || "Failed to delete character"),
    }); 

    const confirmDelete = useCallback(async () => {
        await deleteMutation.mutateAsync({ id });
    }, [deleteMutation, id]);

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setOpen(true)}
                aria-label="Delete character"
            >
                <Trash2 className="h-3 w-3" />
            </Button>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Character</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this character? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
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