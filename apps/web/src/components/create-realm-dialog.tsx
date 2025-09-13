"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient, trpc } from "@/utils/trpc";

const createRealmSchema = z.object({
	id: z.string().min(1, "ID is required"),
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	password: z.string().optional(),
});

type CreateRealmFormData = z.infer<typeof createRealmSchema>;

interface CreateRealmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateRealmDialog({
	open,
	onOpenChange,
}: CreateRealmDialogProps) {
	const createIdInputId = useId();
	const createNameInputId = useId();
	const createDescriptionInputId = useId();
	const createPasswordInputId = useId();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<CreateRealmFormData>({
		resolver: zodResolver(createRealmSchema),
		defaultValues: {
			id: "",
			name: "",
			description: "",
			password: "",
		},
	});

	const createMutation = useMutation({
		...trpc.realm.create.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries();
			toast.success("Realm created.");
			handleClose();
		},
		onError: (err) => toast.error(err.message),
	});

	const onSubmit = async (data: CreateRealmFormData) => {
		try {
			await createMutation.mutateAsync({
				id: data.id,
				name: data.name,
				description: data.description || undefined,
				password: data.password || undefined,
			});
		} catch {}
	};

	const handleClose = () => {
		reset();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create realm</DialogTitle>
					<DialogDescription>
						Fill in the details to create a new realm.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor={createIdInputId}>ID</Label>
						<Input
							id={createIdInputId}
							{...register("id")}
							className={errors.id ? "border-red-500" : ""}
						/>
						{errors.id && (
							<p className="text-red-500 text-sm">{errors.id.message}</p>
						)}
					</div>
					<div className="grid gap-2">
						<Label htmlFor={createNameInputId}>Name</Label>
						<Input
							id={createNameInputId}
							{...register("name")}
							className={errors.name ? "border-red-500" : ""}
						/>
						{errors.name && (
							<p className="text-red-500 text-sm">{errors.name.message}</p>
						)}
					</div>
					<div className="grid gap-2">
						<Label htmlFor={createDescriptionInputId}>
							Description (optional)
						</Label>
						<Input id={createDescriptionInputId} {...register("description")} />
					</div>
					<div className="grid gap-2">
						<Label htmlFor={createPasswordInputId}>Password (optional)</Label>
						<Input
							id={createPasswordInputId}
							type="password"
							{...register("password")}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" type="button" onClick={handleClose}>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting || createMutation.isPending}
						>
							{createMutation.isPending ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
