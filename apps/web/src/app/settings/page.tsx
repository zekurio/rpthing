"use client";

import type { User } from "better-auth";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function SettingsPage() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const user = (session?.user as User | undefined) || undefined;
	const nameId = useId();

	// Name state
	const [name, setName] = useState<string>(user?.name || "");
	const [savingName, setSavingName] = useState(false);

	useEffect(() => {
		setName(user?.name || "");
	}, [user?.name]);

	const handleSaveName = async () => {
		if (!name || name === user?.name) return;
		try {
			setSavingName(true);
			await authClient.updateUser({ name });
			toast.success("Name updated");
		} catch (err) {
			console.error(err);
			toast.error("Failed to update name");
		} finally {
			setSavingName(false);
		}
	};

	// Delete account
	const [deleting, setDeleting] = useState(false);
	const handleDeleteAccount = async () => {
		try {
			setDeleting(true);
			await authClient.deleteUser();
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
		<>
			<SiteHeader />
			<main className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
				<header>
					<h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
					<p className="text-muted-foreground text-sm">
						Manage your account preferences and security.
					</p>
				</header>

				{/* Name Card */}
				<Card>
					<CardHeader>
						<CardTitle>Profile</CardTitle>
						<CardDescription>Update your display name.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4">
							<div className="grid gap-2">
								<Label htmlFor={nameId}>Name</Label>
								<Input
									id={nameId}
									placeholder="Your name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									disabled={isPending || savingName}
								/>
							</div>
							<div className="flex items-center justify-end gap-2">
								<Button
									variant="secondary"
									onClick={() => setName(user?.name || "")}
									disabled={
										isPending || savingName || name === (user?.name || "")
									}
								>
									Reset
								</Button>
								<Button
									onClick={handleSaveName}
									disabled={
										isPending ||
										savingName ||
										!name ||
										name === (user?.name || "")
									}
								>
									{savingName && (
										<Loader2 className="mr-2 size-4 animate-spin" />
									)}
									Save changes
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Delete Account Card */}
				<Card>
					<CardHeader>
						<CardTitle className="text-destructive">Delete account</CardTitle>
						<CardDescription>
							Permanently delete your account and all associated data. This
							action cannot be undone.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive" disabled={deleting}>
									{deleting ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : (
										<Trash2 className="mr-2 size-4" />
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
											<Loader2 className="mr-2 size-4 animate-spin" />
										)}
										Delete account
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</CardContent>
				</Card>
			</main>
		</>
	);
}
