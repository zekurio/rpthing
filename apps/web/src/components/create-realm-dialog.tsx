"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { IconUploadButton } from "@/components/icon-upload-button";
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
import { Textarea } from "@/components/ui/textarea";
import { queryClient, trpc } from "@/utils/trpc";

const createRealmSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	password: z.string().optional(),
	imageBase64: z.string().optional(),
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
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create a Realm</DialogTitle>
					<DialogDescription>
						Fill out the form to create a new realm.
					</DialogDescription>
				</DialogHeader>
				<CreateRealmForm
					onCompleted={() => onOpenChange(false)}
					onCancel={() => onOpenChange(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}

function CreateRealmForm({
	onCompleted,
	onCancel,
}: {
	onCompleted: () => void;
	onCancel: () => void;
}) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);

	const form = useForm<CreateRealmFormData>({
		resolver: zodResolver(createRealmSchema),
		defaultValues: { name: "", description: "", password: "", imageBase64: "" },
	});

	const createMutation = useMutation({
		...trpc.realm.create.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries();
			toast.success("Realm created.");
			onCompleted();
		},
		onError: (err) => toast.error(err.message),
	});

	const handleRemoveIcon = () => {
		setSelectedFile(null);
		setImagePreview(null);
	};

	const convertFileToBase64 = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	};

	const onSubmit = async (data: CreateRealmFormData) => {
		try {
			let imageBase64: string | undefined;
			if (selectedFile) {
				imageBase64 = await convertFileToBase64(selectedFile);
			}
			await createMutation.mutateAsync({
				name: data.name,
				description: data.description || undefined,
				password: data.password || undefined,
				imageBase64,
			});
		} catch {}
	};

	return (
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
							previewSrc={imagePreview || undefined}
							onSelect={(file, preview) => {
								setSelectedFile(file);
								setImagePreview(preview);
							}}
						/>
						{imagePreview && (
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
				<div className="flex items-center justify-end gap-2 pt-2">
					<Button variant="outline" type="button" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={form.formState.isSubmitting || createMutation.isPending}
					>
						{createMutation.isPending ? "Creating..." : "Create"}
					</Button>
				</div>
			</form>
		</Form>
	);
}

export default CreateRealmDialog;
