"use client";

import { Loader2, Trash2 } from "lucide-react";
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
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
		<div className="space-y-6">
			{/* Account Information Card */}
			<Card>
				<CardHeader>
					<CardTitle>Account Information</CardTitle>
					<CardDescription>
						View your account details and email address.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
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
				</CardContent>
			</Card>

			{/* Delete Account Card */}
			<Card>
				<CardHeader>
					<CardTitle className="text-destructive">Delete account</CardTitle>
					<CardDescription>
						Permanently delete your account and all associated data. This action
						cannot be undone.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" disabled={deleting}>
								{deleting ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Trash2 className="mr-2 h-4 w-4" />
								)}
								Delete my account
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
								<AlertDialogDescription>
									This action will permanently delete your account and remove
									your sessions. This cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={deleting}>
									Cancel
								</AlertDialogCancel>
								<AlertDialogAction
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									onClick={handleDeleteAccount}
									disabled={deleting}
								>
									{deleting && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Delete account
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</CardContent>
			</Card>
		</div>
	);
}
