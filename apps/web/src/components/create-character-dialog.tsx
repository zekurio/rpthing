"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
import { useRealmGenderOptions } from "@/hooks/use-realm-gender-options";
import { queryClient, trpc } from "@/utils/trpc";

const formSchema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	gender: z.string().max(50).optional(),
	notes: z.string().max(10000).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateCharacterDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	realmId: string;
	onCreated: () => void;
}

export function CreateCharacterDialog({
	open,
	onOpenChange,
	realmId,
	onCreated,
}: CreateCharacterDialogProps) {
	const genderOptions = useRealmGenderOptions(realmId);

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: { name: "", gender: "", notes: "" },
	});

	const mutation = useMutation({
		...trpc.character.create.mutationOptions(),
		onSuccess: () => {
			toast.success("Character created");
			onCreated();
			onOpenChange(false);
			form.reset({ name: "", gender: "", notes: "" });
		},
		onError: (e) => toast.error(e.message || "Failed to create"),
	});

	const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "";
	const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
	const [imagePreview, setImagePreview] = React.useState<string | null>(null);
	const [originalFile, setOriginalFile] = React.useState<File | null>(null);
	const [percentCrop, setPercentCrop] = React.useState<{
		unit?: string;
		x?: number;
		y?: number;
		width?: number;
		height?: number;
	} | null>(null);

	const onSubmit = React.useCallback(
		async (data: FormData) => {
			const created = await mutation.mutateAsync({
				realmId,
				name: data.name.trim(),
				gender: data.gender?.trim() || undefined,
				notes: data.notes?.trim() || undefined,
			});
			if (selectedFile) {
				const fd = new FormData();
				// Prefer uploading the original with crop so server can generate and save both keys
				if (originalFile && percentCrop) {
					fd.append("file", originalFile);
					fd.append("crop", JSON.stringify(percentCrop));
				} else {
					fd.append("file", selectedFile);
				}
				await fetch(`${serverUrl}/api/upload/character-image/${created.id}`, {
					method: "POST",
					body: fd,
					credentials: "include",
				});
				queryClient.invalidateQueries({
					queryKey: trpc.character.list.queryKey({ realmId }),
				});
			}
		},
		[mutation, realmId, selectedFile, serverUrl, originalFile, percentCrop],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New Character</DialogTitle>
					<DialogDescription>
						Create a character for this realm.
					</DialogDescription>
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
											maxLength={200}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="gender"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Gender (optional)</FormLabel>
									<FormControl>
										<Combobox
											options={genderOptions}
											value={field.value}
											onValueChange={field.onChange}
											placeholder="Select gender..."
											allowCustom={true}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notes (optional)</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											placeholder="Notes"
											className="min-h-[80px]"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="grid gap-2">
							<FormLabel>Image (optional)</FormLabel>
							<ImageUpload
								previewSrc={imagePreview}
								onSelect={(file, preview, meta) => {
									setSelectedFile(file);
									setImagePreview(preview);
									setOriginalFile(meta?.originalFile ?? null);
									setPercentCrop(meta?.percentCrop ?? null);
								}}
								onRemove={() => {
									setSelectedFile(null);
									setImagePreview(null);
									setOriginalFile(null);
									setPercentCrop(null);
								}}
							/>
						</div>
						<div className="flex items-center justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={mutation.isPending}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={form.formState.isSubmitting || mutation.isPending}
							>
								{mutation.isPending || selectedFile ? "Creating..." : "Create"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
