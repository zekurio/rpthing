"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { IconUploadButton } from "@/components/icon-upload-button";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { queryClient, trpc } from "@/utils/trpc";

const editRealmSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	password: z.string().optional(),
});

type EditRealmFormData = z.infer<typeof editRealmSchema>;

interface EditRealmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	realmId: string | null;
}

export function EditRealmDialog({
	open,
	onOpenChange,
	realmId,
}: EditRealmDialogProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [removeIcon, setRemoveIcon] = useState(false);

	const { data: realm } = useQuery(trpc.realm.list.queryOptions());
	const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "";

	const form = useForm<EditRealmFormData>({
		resolver: zodResolver(editRealmSchema),
		defaultValues: { name: "", description: "", password: "" },
	});

	const updateMutation = useMutation({
		...trpc.realm.update.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trpc.realm.list.queryKey() });
			toast.success("Realm updated.");
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	const currentRealm = realm?.find((r) => r.id === realmId);
	const currentIconSrc = currentRealm?.iconKey || null;

	useEffect(() => {
		if (currentRealm && open) {
			form.reset({
				name: currentRealm.name || "",
				description: currentRealm.description || "",
				password: "",
			});
			setSelectedFile(null);
			setImagePreview(null);
			setRemoveIcon(false);
		}
	}, [currentRealm, open, form]);

	const uploadFile = async (realmId: string, file: File): Promise<void> => {
		const formData = new FormData();
		formData.append("file", file);

		const response = await fetch(
			`${serverUrl}/api/upload/realm-icon/${realmId}`,
			{
				method: "POST",
				body: formData,
				credentials: "include",
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to upload icon");
		}
	};

	const deleteIcon = async (realmId: string): Promise<void> => {
		const response = await fetch(
			`${serverUrl}/api/upload/realm-icon/${realmId}`,
			{
				method: "DELETE",
				credentials: "include",
			},
		);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to delete icon");
		}
	};

	const handleRemoveIcon = () => {
		setSelectedFile(null);
		setImagePreview(null);
		setRemoveIcon(true);
	};

	const onSubmit = async (data: EditRealmFormData) => {
		if (!realmId) return;

		try {
			// First update the realm
			await updateMutation.mutateAsync({
				id: realmId,
				name: data.name,
				description: data.description || undefined,
				password: data.password || undefined,
			});

			// Handle icon operations
			if (selectedFile) {
				// Upload new icon
				await uploadFile(realmId, selectedFile);
				// Invalidate realm list to refresh sidebar
				queryClient.invalidateQueries({ queryKey: trpc.realm.list.queryKey() });
			} else if (removeIcon && currentIconSrc) {
				// Remove existing icon
				await deleteIcon(realmId);
				// Invalidate realm list to refresh sidebar
				queryClient.invalidateQueries({ queryKey: trpc.realm.list.queryKey() });
			}
		} catch (error) {
			console.error("Failed to update realm or handle icon:", error);
		}
	};

	const onClose = () => {
		form.reset();
		setSelectedFile(null);
		setImagePreview(null);
		setRemoveIcon(false);
		onOpenChange(false);
	};

	if (!realmId) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit realm</DialogTitle>
					<DialogDescription>Update the realm details below.</DialogDescription>
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
										<Input {...field} />
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
											placeholder="Enter a description for this realm..."
											className="min-h-[80px] resize-none"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Password (optional)</FormLabel>
									<FormControl>
										<Input type="password" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="grid gap-2">
							<FormLabel>Icon (optional)</FormLabel>
							<div className="flex items-center gap-3">
								<IconUploadButton
									previewSrc={
										removeIcon
											? undefined
											: imagePreview || currentIconSrc || undefined
									}
									onSelect={(file, preview) => {
										setSelectedFile(file);
										setImagePreview(preview);
										setRemoveIcon(false);
									}}
								/>
								{(imagePreview || currentIconSrc) && !removeIcon && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={handleRemoveIcon}
									>
										Remove
									</Button>
								)}
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" type="button" onClick={onClose}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={
									form.formState.isSubmitting || updateMutation.isPending
								}
							>
								{updateMutation.isPending ? "Updating..." : "Update"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export default EditRealmDialog;
