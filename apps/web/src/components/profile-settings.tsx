"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { ButtonLoading } from "@/components/ui/loading";
import { useAuth } from "@/hooks/use-auth";

// Schema
const nameSchema = z
	.string()
	.trim()
	.min(2, "Name must be at least 2 characters.")
	.max(64, "Name must be at most 64 characters.")
	.regex(
		/^[\p{L}\p{N} .,'-]+$/u,
		"Only letters, numbers, spaces, and .,'- are allowed.",
	);

const formSchema = z.object({
	name: nameSchema,
});

type FormValues = z.infer<typeof formSchema>;

export function ProfileSettings() {
	const { user, isLoading, updateProfile } = useAuth();

	// Track a transient success state to show a quick success indicator
	const [justSaved, setJustSaved] = useState(false);

	// Stable defaults derived from user. useMemo prevents unnecessary resets.
	const defaultValues = useMemo<FormValues>(
		() => ({ name: user?.name ?? "" }),
		[user?.name],
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		mode: "onChange",
		reValidateMode: "onChange",
		defaultValues,
	});

	const {
		control,
		handleSubmit,
		reset,
		setError,
		watch,
		formState: { isDirty, isSubmitting, errors },
	} = form;

	// Keep form in sync with user changes
	useEffect(() => {
		reset(defaultValues, { keepDirty: false, keepTouched: false });
	}, [defaultValues, reset]);

	// Character count helper
	const nameValue = watch("name") ?? "";
	const maxLen = 64;
	const remaining = Math.max(0, maxLen - nameValue.length);

	const onSubmit = async (values: FormValues) => {
		// Avoid no-op submits
		if (!isDirty || values.name === (user?.name ?? "")) return;
		try {
			await updateProfile({ name: values.name.trim() });
			toast.success("Name updated");
			setJustSaved(true);
			// Reset the form to clear dirty state with the new value
			reset({ name: values.name.trim() });
			// Briefly show a success state on the button
			setTimeout(() => setJustSaved(false), 900);
		} catch (err: unknown) {
			console.error(err);
			setError("name", {
				type: "server",
				message: "Failed to update name. Please try again.",
			});
			toast.error("Failed to update name");
		}
	};

	// Initial loading skeleton
	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="space-y-4">
					<div>
						<div className="h-5 w-20 animate-pulse rounded bg-muted" />
						<div className="mt-1 h-3 w-48 animate-pulse rounded bg-muted" />
					</div>
					<div className="grid gap-4">
						<div className="grid gap-2">
							<div className="h-3 w-10 animate-pulse rounded bg-muted" />
							<div className="h-8 w-full animate-pulse rounded bg-muted" />
							<div className="h-3 w-24 animate-pulse rounded bg-muted" />
						</div>
						<div className="flex items-center justify-end gap-2">
							<div className="h-7 w-16 animate-pulse rounded bg-muted" />
							<div className="h-7 w-24 animate-pulse rounded bg-muted" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div aria-busy={isSubmitting} aria-live="polite">
				<div className="space-y-2">
					<div>
						<h3 className="font-medium text-sm">Profile</h3>
						<p className="text-muted-foreground text-xs">
							Update your display name.
						</p>
					</div>
					<Form {...form}>
						<form
							onSubmit={handleSubmit(onSubmit)}
							className="grid gap-3"
							noValidate
						>
							<FormField
								control={control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input
												{...field}
												placeholder="Your name"
												autoComplete="name"
												spellCheck={false}
												maxLength={maxLen}
												aria-invalid={!!errors.name}
											/>
										</FormControl>
										<div className="flex items-center justify-between">
											<FormDescription className="text-muted-foreground text-xs">
												Use a recognizable display name.
											</FormDescription>
											<span
												className={`text-xs ${
													remaining <= 8
														? "text-amber-600"
														: "text-muted-foreground"
												}`}
												aria-live="polite"
											>
												{remaining} left
											</span>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex items-center justify-end gap-2">
								<Button
									type="button"
									variant="secondary"
									onClick={() => reset(defaultValues)}
								>
									<RotateCcw className="mr-2 h-4 w-4" />
									Reset
								</Button>

								<Button type="submit">
									{isSubmitting ? (
										<ButtonLoading loading={true}>Saving...</ButtonLoading>
									) : justSaved ? (
										<>
											<Check className="mr-2 h-4 w-4 text-emerald-600" />
											Saved
										</>
									) : (
										"Save changes"
									)}
								</Button>
							</div>
						</form>
					</Form>
				</div>
			</div>
		</div>
	);
}
