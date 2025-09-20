"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/ui/loading";
import { useAuth } from "@/hooks/use-auth";

export function AccountSettings() {
	const router = useRouter();
	const { user, deleteAccount } = useAuth();

	// Delete account
	const [deleting, setDeleting] = useState(false);
	const handleDeleteAccount = async () => {
		try {
			setDeleting(true);
			await deleteAccount();
			toast.success("Your account has been deleted");
			router.push("/");
		} catch (err) {
			console.error(err);
			toast.error("Failed to delete account");
		} finally {
			setDeleting(false);
		}
	};

	return (
		<div className="space-y-3">
			{/* Account Information */}
			<div className="space-y-2">
				<div>
					<h3 className="font-medium text-sm">Account Information</h3>
					<p className="text-muted-foreground text-xs">
						Your account details and verification status.
					</p>
				</div>
				<div className="space-y-3">
					<div className="grid gap-2">
						<div className="font-medium text-sm">Email</div>
						<div className="cursor-not-allowed rounded-md border bg-muted px-3 py-2 text-muted-foreground text-sm">
							{user?.email || "Not available"}
						</div>
					</div>
					<div className="grid gap-2">
						<div className="font-medium text-sm">Account Status</div>
						<div className="cursor-not-allowed rounded-md border bg-muted px-3 py-2 text-muted-foreground text-sm">
							{user?.emailVerified ? "Verified" : "Unverified"}
						</div>
					</div>
				</div>
			</div>

			{/* Delete Account */}
			<div className="space-y-2">
				<div>
					<h3 className="font-medium text-destructive text-sm">
						Delete account
					</h3>
					<p className="text-muted-foreground text-xs">
						Permanently delete your account. This cannot be undone.
					</p>
				</div>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="destructive" disabled={deleting}>
							<ButtonLoading loading={deleting}>
								<Trash2 className="mr-2 h-4 w-4" />
								Delete account
							</ButtonLoading>
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete account?</AlertDialogTitle>
							<AlertDialogDescription>
								This will permanently delete your account and all data. This
								action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
							<AlertDialogAction
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								onClick={handleDeleteAccount}
								disabled={deleting}
							>
								<ButtonLoading loading={deleting}>Yes, delete</ButtonLoading>
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}
