"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ImageUpload } from "@/components/image-upload";
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { uploadWithProgress } from "@/lib/utils";
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
	realmName?: string;
}

export function EditRealmDialog({
	open,
	onOpenChange,
	realmId,
	realmName,
}: EditRealmDialogProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [removeIcon, setRemoveIcon] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);

	const { data: realm } = useQuery({
		...trpc.realm.getById.queryOptions({ realmId: realmId ?? "" }),
		enabled: !!realmId && open,
		retry: 2,
		retryDelay: 1000,
	});

	const form = useForm<EditRealmFormData>({
		resolver: zodResolver(editRealmSchema),
		defaultValues: { name: "", description: "", password: "" },
	});

	const updateMutation = useMutation({
		...trpc.realm.update.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trpc.realm.list.queryKey() });
			if (realmId) {
				queryClient.invalidateQueries({
					queryKey: trpc.realm.getById.queryKey({ realmId }),
				});
			}
			toast.success("Realm updated.");
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	const currentIconSrc = realm?.iconKey || null;

	useEffect(() => {
		if (open) {
			form.reset({
				name: realm?.name || realmName || "",
				description: realm?.description || "",
				password: "",
			});
			setSelectedFile(null);
			setImagePreview(null);
			setRemoveIcon(false);
		}
	}, [realm, realmName, open, form]);

	const uploadFile = async (realmId: string, file: File): Promise<void> => {
		const formData = new FormData();
		formData.append("file", file);
		setIsUploading(true);
		setUploadProgress(0);
		try {
			const response = await uploadWithProgress({
				url: `/api/upload/realm-icon/${realmId}`,
				formData,
				onProgress: (p) => setUploadProgress(p < 0 ? 0 : p),
				withCredentials: true,
			});
			if (!response.ok) {
				let errMsg = "Failed to upload icon";
				try {
					const json = await response.json();
					errMsg = json?.error || errMsg;
				} catch {}
				throw new Error(errMsg);
			}
		} finally {
			setIsUploading(false);
			setUploadProgress(0);
		}
	};

	const deleteIcon = async (realmId: string): Promise<void> => {
		const response = await fetch(`/api/upload/realm-icon/${realmId}`, {
			method: "DELETE",
			credentials: "include",
		});

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
							<ImageUpload
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
								onRemove={handleRemoveIcon}
							/>
							{isUploading ? (
								<div className="flex items-center gap-2">
									<Progress value={uploadProgress} className="h-2 w-full" />
									<span className="text-muted-foreground text-xs">
										{Math.max(0, Math.round(uploadProgress))}%
									</span>
								</div>
							) : null}
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
