"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
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
} from "@/components/ui/alert-dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, trpc } from "@/utils/trpc";

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

interface TraitsManagerProps {
	realmId: string;
}

export function TraitsManager({ realmId }: TraitsManagerProps) {
	const { data: traits, isLoading } = useQuery({
		...trpc.trait.list.queryOptions({ realmId }),
	});

	const [createOpen, setCreateOpen] = useState(false);

	const invalidateList = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: trpc.trait.list.queryKey({ realmId }),
		});
	}, [realmId]);

	return (
		<div className="grid gap-4">
			<div className="flex items-center justify-between">
				<h3 className="font-semibold text-lg">Traits</h3>
				<Button size="sm" onClick={() => setCreateOpen(true)}>
					<Plus className="mr-1 h-3 w-3" /> New
				</Button>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			) : traits && traits.length > 0 ? (
				<div className="space-y-2">
					{traits.map((t) => (
						<div
							key={t.id}
							className="flex items-center justify-between gap-3 rounded-md border p-3"
						>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className="truncate font-medium">{t.name}</span>
									<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs uppercase">
										{t.displayMode}
									</span>
								</div>
								{t.description && (
									<p className="mt-1 truncate text-muted-foreground text-sm">
										{t.description}
									</p>
								)}
							</div>
							<div className="flex shrink-0 items-center gap-1">
								<EditTraitDialog trait={t} onUpdated={invalidateList} />
								<DeleteTraitButton id={t.id} onDeleted={invalidateList} />
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="rounded-md border p-6 text-center text-muted-foreground text-sm">
					No traits yet. Create your first one.
				</div>
			)}

			<CreateTraitDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				realmId={realmId}
				onCreated={invalidateList}
			/>
		</div>
	);
}

type Trait = {
	id: string;
	name: string;
	description: string | null;
	displayMode: "number" | "grade";
	realmId: string;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};

function CreateTraitDialog({
	open,
	onOpenChange,
	realmId,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	realmId: string;
	onCreated: () => void;
}) {
	const form = useForm<TraitFormData>({
		resolver: zodResolver(traitFormSchema),
		defaultValues: { name: "", description: "", displayMode: "grade" },
	});

	const createMutation = useMutation({
		...trpc.trait.create.mutationOptions(),
		onSuccess: () => {
			onCreated();
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
								{createMutation.isPending ? "Creating..." : "Create"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function EditTraitDialog({
	trait,
	onUpdated,
}: {
	trait: Trait;
	onUpdated: () => void;
}) {
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
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Trait</DialogTitle>
						<DialogDescription>Update trait details.</DialogDescription>
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
									onClick={() => setOpen(false)}
									disabled={updateMutation.isPending}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={
										form.formState.isSubmitting || updateMutation.isPending
									}
								>
									{updateMutation.isPending ? "Saving..." : "Save"}
								</Button>
							</div>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</>
	);
}

function DeleteTraitButton({
	id,
	onDeleted,
}: {
	id: string;
	onDeleted: () => void;
}) {
	const [open, setOpen] = useState(false);
	const deleteMutation = useMutation({
		...trpc.trait.delete.mutationOptions(),
		onSuccess: () => {
			onDeleted();
			toast.success("Trait deleted");
			setOpen(false);
		},
		onError: (err) => toast.error(err.message || "Failed to delete trait"),
	});

	const confirmDelete = useCallback(async () => {
		await deleteMutation.mutateAsync(id);
	}, [deleteMutation, id]);

	return (
		<>
			<Button
				variant="ghost"
				size="sm"
				className="text-destructive"
				onClick={() => setOpen(true)}
				aria-label="Delete trait"
			>
				<Trash2 className="h-3 w-3" />
			</Button>
			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete trait?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

export default TraitsManager;
