"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ButtonLoading } from "@/components/ui/loading";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, trpc } from "@/lib/trpc";

const traitFormSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(100, "Name must be at most 100 characters"),
	description: z
		.string()
		.max(2000, "Description must be at most 2000 characters")
		.optional(),
	displayMode: z.enum(["number", "grade"]).optional(),
});

type TraitFormData = z.infer<typeof traitFormSchema>;

interface CreateTraitDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	realmId: string;
	onCreated: () => void;
}

export function CreateTraitDialog({
	open,
	onOpenChange,
	realmId,
	onCreated,
}: CreateTraitDialogProps) {
	const form = useForm<TraitFormData>({
		resolver: zodResolver(traitFormSchema),
		defaultValues: { name: "", description: "", displayMode: "grade" },
	});

	const createMutation = useMutation({
		...trpc.trait.create.mutationOptions(),
		onSuccess: () => {
			onCreated();
			// Ensure character ratings views pick up the new trait
			queryClient.invalidateQueries({
				predicate: (q) =>
					JSON.stringify(q.queryKey).includes("character.getWithRatings"),
			});
			toast.success("Trait created");
			handleClose();
		},
		onError: (err) => {
			toast.error(err.message || "Failed to create trait");
		},
	});

	const handleClose = useCallback(() => {
		onOpenChange(false);
		form.reset({ name: "", description: "", displayMode: "grade" });
	}, [form, onOpenChange]);

	const onSubmit = useCallback(
		async (data: TraitFormData) => {
			await createMutation.mutateAsync({
				realmId,
				name: data.name.trim(),
				description: data.description?.trim() || undefined,
				displayMode: data.displayMode,
			});
		},
		[createMutation, realmId],
	);

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => (o ? onOpenChange(o) : handleClose())}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New Trait</DialogTitle>
					<DialogDescription>Create a trait for this realm.</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder="Enter name"
											maxLength={100}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="displayMode"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Display Mode</FormLabel>
									<FormControl>
										<select
											value={field.value ?? "grade"}
											onChange={(e) => field.onChange(e.target.value)}
											className="h-9 rounded-md border bg-background px-3 text-sm"
										>
											<option value="grade">Grade</option>
											<option value="number">Number</option>
										</select>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description (optional)</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											placeholder="Describe the trait"
											className="min-h-[80px] resize-none"
											maxLength={2000}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex items-center justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={handleClose}
								disabled={createMutation.isPending}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={
									form.formState.isSubmitting || createMutation.isPending
								}
							>
								<ButtonLoading loading={createMutation.isPending}>
									{createMutation.isPending ? "Creating..." : "Create"}
								</ButtonLoading>
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
