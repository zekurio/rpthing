"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, LogOut, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

const profileSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, "Name must be at least 2 characters")
			.max(60, "Name must be under 60 characters"),
	})
	.transform((values) => ({
		name: values.name,
	}));

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
	const router = useRouter();
	const formId = useId();
	const { user, isLoading, error, updateProfile, signOut, deleteAccount } =
		useAuth();
	const [isSaving, startSaving] = useTransition();
	const [isSigningOut, startSigningOut] = useTransition();
	const [isDeleting, startDeleting] = useTransition();

	const initialValues = useMemo<ProfileFormValues>(
		() => ({
			name: user?.name ?? "",
			image: user?.image ?? "",
		}),
		[user?.image, user?.name],
	);

	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileSchema),
		defaultValues: initialValues,
		mode: "onChange",
	});

	useEffect(() => {
		form.reset(initialValues);
	}, [form, initialValues]);

	const handleBack = () => {
		if (typeof window !== "undefined" && window.history.length > 1) {
			router.back();
		} else {
			router.push("/realms");
		}
	};

	const handleSubmit = form.handleSubmit((values) => {
		const payload: { name?: string; image?: string | null } = {};
		const trimmedName = values.name.trim();
		if (trimmedName.length && trimmedName !== (user?.name ?? "")) {
			payload.name = trimmedName;
		}

		if (!Object.keys(payload).length) {
			toast.info("Nothing to update");
			return;
		}

		startSaving(async () => {
			try {
				await updateProfile(payload);
				toast.success("Profile updated");
			} catch (err) {
				console.error(err);
				toast.error("Could not update profile");
			}
		});
	});

	const handleSignOut = () => {
		startSigningOut(async () => {
			try {
				await signOut();
				router.push("/login");
			} catch (err) {
				console.error(err);
				toast.error("Sign out failed");
			}
		});
	};

	const handleDeleteAccount = () => {
		startDeleting(async () => {
			try {
				await deleteAccount();
				toast.success("Account deleted");
				router.push("/");
			} catch (err) {
				console.error(err);
				toast.error("Could not delete account");
			}
		});
	};

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<LoadingSpinner size="lg" className="text-primary" />
			</div>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pt-10 pb-16 sm:gap-10 sm:px-6">
			<div>
				<Button
					type="button"
					variant="ghost"
					onClick={handleBack}
					className="gap-2 rounded-full px-3 py-2 text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="size-4" />
					Back
				</Button>
			</div>

			<section className="space-y-3">
				<p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
					Settings
				</p>
				<h1 className="text-pretty font-semibold text-3xl tracking-tight sm:text-4xl">
					Shape your profile
				</h1>
				<p className="text-base text-muted-foreground">
					Update the basics and keep your account tidy across every device.
				</p>
			</section>

			{error ? (
				<div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive text-sm">
					{error.message || "We couldn’t load your session. Please refresh."}
				</div>
			) : null}

			<section className="overflow-hidden rounded-3xl border border-border/60 bg-background/70 shadow-[0_40px_80px_-60px_rgba(0,0,0,0.6)] backdrop-blur">
				<div className="space-y-6 p-6 sm:p-8">
					<div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-4">
							<Avatar className="h-16 w-16 rounded-2xl border border-border/50">
								<AvatarImage
									src={user?.image ?? undefined}
									alt={user?.name ?? ""}
								/>
								<AvatarFallback className="rounded-2xl font-semibold text-lg">
									{user?.name?.[0]?.toUpperCase() ?? "U"}
								</AvatarFallback>
							</Avatar>
							<div className="space-y-1">
								<p className="font-medium text-muted-foreground text-sm">
									Signed in as
								</p>
								<p className="font-semibold text-lg leading-tight">
									{user?.name ?? "Unknown user"}
								</p>
								{user?.email ? (
									<p className="text-muted-foreground text-sm">{user.email}</p>
								) : null}
							</div>
						</div>
						<Button
							type="submit"
							form={formId}
							disabled={isSaving || !form.formState.isDirty}
							className="self-start rounded-full px-6"
						>
							{isSaving ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : null}
							Save changes
						</Button>
					</div>

					<Separator className="bg-border/60" />

					<Form {...form}>
						<form id={formId} className="grid gap-6" onSubmit={handleSubmit}>
							<div className="grid gap-2">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Display name</FormLabel>
											<FormControl>
												<Input
													placeholder="How others see you"
													autoComplete="name"
													{...field}
												/>
											</FormControl>
											<FormDescription>
												Pick something recognizable for your party.
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</form>
					</Form>
				</div>
			</section>

			<section className="space-y-6 rounded-3xl border border-border/50 bg-muted/40 p-6 sm:p-8">
				<header className="space-y-1">
					<h2 className="font-semibold text-xl">Account security</h2>
					<p className="text-muted-foreground text-sm">
						Sign out on shared devices or permanently remove your account.
					</p>
				</header>

				<div className="grid gap-4">
					<div className="flex flex-col gap-3 rounded-2xl bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-1">
							<p className="font-medium">Sign out everywhere</p>
							<p className="text-muted-foreground text-sm">
								We’ll end your session on this device and clear cached data.
							</p>
						</div>
						<Button
							variant="outline"
							onClick={handleSignOut}
							disabled={isSigningOut}
							className="w-full gap-2 rounded-full sm:w-auto"
						>
							{isSigningOut ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<LogOut className="size-4" />
							)}
							Sign out
						</Button>
					</div>

					<AlertDialog>
						<div className="flex flex-col gap-3 rounded-2xl bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="space-y-1">
								<p className="font-medium text-destructive">Delete account</p>
								<p className="text-destructive/80 text-sm">
									Remove everything tied to your profile. This cannot be undone.
								</p>
							</div>
							<AlertDialogTrigger asChild>
								<Button
									variant="destructive"
									className="w-full gap-2 rounded-full sm:w-auto"
									disabled={isDeleting}
								>
									{isDeleting ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Trash className="size-4" />
									)}
									Delete account
								</Button>
							</AlertDialogTrigger>
						</div>

						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									Permanently delete your account?
								</AlertDialogTitle>
								<AlertDialogDescription>
									This removes your profile, characters, and realm memberships.
									You cannot recover them later.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={isDeleting}>
									Cancel
								</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleDeleteAccount}
									disabled={isDeleting}
									className="gap-2"
								>
									{isDeleting ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Trash className="size-4" />
									)}
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</section>
		</main>
	);
}
