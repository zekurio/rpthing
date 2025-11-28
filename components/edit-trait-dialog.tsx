"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import type { Trait } from "@types";
import { Pencil } from "lucide-react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import {
	ResponsiveDialog,
	ResponsiveDialogBody,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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

interface EditTraitDialogProps {
	trait: Trait;
	onUpdated: () => void;
}

export function EditTraitDialog({ trait, onUpdated }: EditTraitDialogProps) {
	const [open, setOpen] = useState(false);
	const form = useForm<TraitFormData>({
		resolver: zodResolver(traitFormSchema),
		defaultValues: {
			name: trait.name,
			description: trait.description ?? "",
			displayMode: trait.displayMode,
		},
	});

	const updateMutation = useMutation({
		...trpc.trait.update.mutationOptions(),
		onSuccess: () => {
			onUpdated();
			// Invalidate all character rating snapshots so they reflect trait changes
			queryClient.invalidateQueries({
				predicate: (q) =>
					JSON.stringify(q.queryKey).includes("character.getWithRatings"),
			});
			toast.success("Trait updated");
			setOpen(false);
		},
		onError: (err) => toast.error(err.message || "Failed to update trait"),
	});

	const onSubmit = useCallback(
		async (data: TraitFormData) => {
			await updateMutation.mutateAsync({
				id: trait.id,
				name: data.name.trim(),
				description: data.description?.trim() || undefined,
				displayMode: data.displayMode,
			});
		},
		[trait.id, updateMutation],
	);

	const handleOpenChange = useCallback(
		(o: boolean) => {
			if (o) {
				form.reset({
					name: trait.name,
					description: trait.description ?? "",
					displayMode: trait.displayMode,
				});
			}
			setOpen(o);
		},
		[form, trait],
	);

	return (
		<>
			<Button
				variant="ghost"
				size="sm"
				onClick={() => setOpen(true)}
				aria-label="Edit trait"
			>
				<Pencil className="h-3 w-3" />
			</Button>
			<ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
				<ResponsiveDialogContent>
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle>Edit Trait</ResponsiveDialogTitle>
						<ResponsiveDialogDescription>
							Update trait details.
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>
					<ResponsiveDialogBody>
						<Form {...form}>
							<form
								id="edit-trait-form"
								onSubmit={form.handleSubmit(onSubmit)}
								className="grid gap-4"
							>
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
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select a display mode" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="grade">Grade</SelectItem>
													<SelectItem value="number">Number</SelectItem>
												</SelectContent>
											</Select>
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
							</form>
						</Form>
					</ResponsiveDialogBody>
					<ResponsiveDialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={updateMutation.isPending}
							className="w-full sm:w-auto"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							form="edit-trait-form"
							disabled={form.formState.isSubmitting || updateMutation.isPending}
							className="w-full sm:w-auto"
						>
							<ButtonLoading loading={updateMutation.isPending}>
								{updateMutation.isPending ? "Saving..." : "Save"}
							</ButtonLoading>
						</Button>
					</ResponsiveDialogFooter>
				</ResponsiveDialogContent>
			</ResponsiveDialog>
		</>
	);
}
