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
	imageBase64: z.string().optional(),
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
	// retained earlier reset logic no longer needed

	const { data: realm } = useQuery(trpc.realm.list.queryOptions());
	const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "";

	const form = useForm<EditRealmFormData>({
		resolver: zodResolver(editRealmSchema),
		defaultValues: { name: "", description: "", password: "", imageBase64: "" },
	});

	const updateMutation = useMutation({
		...trpc.realm.update.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries();
			toast.success("Realm updated.");
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	const currentRealm = realm?.find((r) => r.id === realmId);
	const currentIconSrc = currentRealm?.iconKey
		? `${serverUrl}${currentRealm.iconKey}`
		: null;

	useEffect(() => {
		if (currentRealm && open) {
			form.reset({
				name: currentRealm.name || "",
				description: currentRealm.description || "",
				password: "",
				imageBase64: "",
			});
			setSelectedFile(null);
			setImagePreview(null);
			// no input element to reset here
		}
	}, [currentRealm, open, form]);

	// file selection is handled inside IconUploadButton now

	const convertFileToBase64 = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	};

	const handleRemoveIcon = () => {
		setSelectedFile(null);
		setImagePreview(null);
		// Set a special value to indicate icon removal
		form.setValue("imageBase64", "REMOVE_ICON");
		// no input element to reset here
	};

	const onSubmit = async (data: EditRealmFormData) => {
		if (!realmId) return;

		try {
			let imageBase64: string | undefined;
			if (selectedFile) {
				imageBase64 = await convertFileToBase64(selectedFile);
			}

			await updateMutation.mutateAsync({
				id: realmId,
				name: data.name,
				description: data.description || undefined,
				password: data.password || undefined,
				imageBase64,
			});
		} catch {}
	};

	const onClose = () => {
		form.reset();
		setSelectedFile(null);
		setImagePreview(null);
		// no input element to reset here
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
									previewSrc={imagePreview || currentIconSrc || undefined}
									onSelect={(file, preview) => {
										setSelectedFile(file);
										setImagePreview(preview);
									}}
								/>
								{(imagePreview || currentIconSrc) && (
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
