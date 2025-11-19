"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { queryClient, trpc } from "@/lib/trpc";

interface LeaveRealmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	realmId: string | null;
	realmName?: string;
	currentRealmId?: string | null;
}

export function LeaveRealmDialog({
	open,
	onOpenChange,
	realmId,
	realmName,
	currentRealmId,
}: LeaveRealmDialogProps) {
	const router = useRouter();

	const leaveMutation = useMutation({
		...trpc.realm.leave.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trpc.realm.list.queryKey() });
			toast.success("Left realm successfully.");
			onOpenChange(false);

			// If the left realm is the current realm, redirect to /realms
			if (realmId && currentRealmId && realmId === currentRealmId) {
				router.push("/realms");
			}
		},
		onError: (err) => toast.error(err.message),
	});

	const handleLeave = async () => {
		if (!realmId) return;
		await leaveMutation.mutateAsync(realmId);
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Leave Realm</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to leave "{realmName || "this realm"}"?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleLeave}
						disabled={leaveMutation.isPending}
					>
						{leaveMutation.isPending ? "Leaving..." : "Leave"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
