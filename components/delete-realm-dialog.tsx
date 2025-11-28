"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/components/ui/responsive-alert-dialog";
import { queryClient, trpc } from "@/lib/trpc";

interface DeleteRealmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	realmId: string | null;
	realmName?: string;
	currentRealmId?: string | null;
}

export function DeleteRealmDialog({
	open,
	onOpenChange,
	realmId,
	realmName,
	currentRealmId,
}: DeleteRealmDialogProps) {
	const router = useRouter();

	const deleteMutation = useMutation({
		...trpc.realm.delete.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.realm.list.queryKey(),
			});
			toast.success("Realm deleted.");
			onOpenChange(false);

			// If the deleted realm is the current realm, redirect to /realms
			if (realmId && currentRealmId && realmId === currentRealmId) {
				router.push("/realms");
			}
		},
		onError: (err) => toast.error(err.message),
	});

	const handleDelete = async () => {
		if (!realmId) return;
		await deleteMutation.mutateAsync(realmId);
	};

	return (
		<ResponsiveAlertDialog open={open} onOpenChange={onOpenChange}>
			<ResponsiveAlertDialogContent>
				<ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogTitle>Delete Realm</ResponsiveAlertDialogTitle>
					<ResponsiveAlertDialogDescription>
						Are you sure you want to delete "{realmName || "this realm"}"? This
						action cannot be undone.
					</ResponsiveAlertDialogDescription>
				</ResponsiveAlertDialogHeader>
				<ResponsiveAlertDialogFooter>
					<ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
					<ResponsiveAlertDialogAction
						onClick={handleDelete}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						disabled={deleteMutation.isPending}
					>
						{deleteMutation.isPending ? "Deleting..." : "Delete"}
					</ResponsiveAlertDialogAction>
				</ResponsiveAlertDialogFooter>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
