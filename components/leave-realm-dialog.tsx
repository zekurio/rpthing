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
import { queryClient, realmMutations } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";

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
		mutationFn: (realmId: string) => realmMutations.leave(realmId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.realm.list(),
			});
			toast.success("Left realm successfully.");
			onOpenChange(false);

			// If the left realm is the current realm, redirect to /characters
			if (realmId && currentRealmId && realmId === currentRealmId) {
				router.push("/characters");
			}
		},
		onError: (err) => toast.error(err.message),
	});

	const handleLeave = async () => {
		if (!realmId) return;
		await leaveMutation.mutateAsync(realmId);
	};

	return (
		<ResponsiveAlertDialog open={open} onOpenChange={onOpenChange}>
			<ResponsiveAlertDialogContent>
				<ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogTitle>Leave Realm</ResponsiveAlertDialogTitle>
					<ResponsiveAlertDialogDescription>
						Are you sure you want to leave "{realmName || "this realm"}"?
					</ResponsiveAlertDialogDescription>
				</ResponsiveAlertDialogHeader>
				<ResponsiveAlertDialogFooter>
					<ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
					<ResponsiveAlertDialogAction
						onClick={handleLeave}
						disabled={leaveMutation.isPending}
					>
						{leaveMutation.isPending ? "Leaving..." : "Leave"}
					</ResponsiveAlertDialogAction>
				</ResponsiveAlertDialogFooter>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
