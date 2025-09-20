"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CharacterRatings } from "@/components/character-ratings";
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useRealmGenderOptions } from "@/hooks/use-realm-gender-options";
import { uploadWithProgress } from "@/lib/utils";
import { queryClient, trpc } from "@/utils/trpc";

const editCharacterSchema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	gender: z.string().max(50).optional(),
	notes: z.string().max(10000).optional(),
});

type EditCharacterFormData = z.infer<typeof editCharacterSchema>;

interface EditCharacterDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	characterId: string;
	onChanged?: () => void;
}

export function EditCharacterDialog({
	open,
	onOpenChange,
	characterId,
	onChanged,
}: EditCharacterDialogProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [removeRequested, setRemoveRequested] = useState(false);
	const [originalFile, setOriginalFile] = useState<File | null>(null);
	const [percentCrop, setPercentCrop] = useState<{
		unit?: string;
		x?: number;
		y?: number;
		width?: number;
		height?: number;
	} | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);

	const { data: character } = useQuery({
		...trpc.character.getById.queryOptions({ id: characterId }),
		enabled: !!characterId && open,
		retry: 2,
		retryDelay: 1000,
	});

	const genderOptions = useRealmGenderOptions(character?.realmId || "");

	const form = useForm<EditCharacterFormData>({
		resolver: zodResolver(editCharacterSchema),
		defaultValues: { name: "", gender: "", notes: "" },
	});

	const updateMutation = useMutation({
		...trpc.character.update.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.character.list.queryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: trpc.character.getById.queryKey({ id: characterId }),
			});
			toast.success("Character updated.");
			onChanged?.();
			onClose();
		},
		onError: (err) => toast.error(err.message),
	});

	useEffect(() => {
		if (character && open) {
			form.reset({
				name: character.name || "",
				gender: character.gender || "",
				notes: character.notes || "",
			});
			setSelectedFile(null);
			setImagePreview(null);
			setRemoveRequested(false);
		}
	}, [character, open, form]);

	const onSubmit = async (data: EditCharacterFormData) => {
		if (!characterId) return;

		await updateMutation.mutateAsync({
			id: characterId,
			name: data.name,
			gender: data.gender || undefined,
			notes: (data.notes?.trim() ?? "") === "" ? null : data.notes?.trim(),
		});

		try {
			if (selectedFile) {
				const fd = new FormData();
				if (originalFile && percentCrop) {
					fd.append("file", originalFile);
					fd.append("crop", JSON.stringify(percentCrop));
				} else {
					fd.append("file", selectedFile);
				}
				setIsUploading(true);
				setUploadProgress(0);
				const response = await uploadWithProgress({
					url: `${process.env.NEXT_PUBLIC_SERVER_URL}/api/upload/character-image/${characterId}`,
					formData: fd,
					onProgress: (p) => setUploadProgress(p < 0 ? 0 : p),
					withCredentials: true,
				});
				if (!response.ok) {
					throw new Error("Failed to upload character image");
				}
				queryClient.invalidateQueries({
					queryKey: trpc.character.getById.queryKey({ id: characterId }),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.character.list.queryKey(),
				});
			} else if (removeRequested && character?.referenceImageKey) {
				await fetch(
					`${process.env.NEXT_PUBLIC_SERVER_URL}/api/upload/character-image/${characterId}`,
					{
						method: "DELETE",
						credentials: "include",
					},
				);
				queryClient.invalidateQueries({
					queryKey: trpc.character.getById.queryKey({ id: characterId }),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.character.list.queryKey(),
				});
			}
		} catch (err) {
			console.error("Character image update failed", err);
		} finally {
			setIsUploading(false);
			setUploadProgress(0);
		}
	};

	const onClose = () => {
		form.reset();
		setSelectedFile(null);
		setImagePreview(null);
		setRemoveRequested(false);
		onOpenChange(false);
	};

	if (!characterId) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit character</DialogTitle>
					<DialogDescription>
						Update the character details below.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="scrollbar-none grid max-h-[75vh] gap-4 overflow-y-auto"
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
											placeholder="Enter character name"
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
											placeholder="Enter character notes, backstory, or description..."
											className="min-h-[80px] resize-none"
											maxLength={10000}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="grid gap-2">
							<FormLabel>Image (optional)</FormLabel>
							<ImageUpload
								previewSrc={
									removeRequested
										? undefined
										: (imagePreview ??
											character?.referenceImageKey ??
											undefined)
								}
								onSelect={(file, preview, meta) => {
									setSelectedFile(file);
									setImagePreview(preview);
									setOriginalFile(meta?.originalFile ?? null);
									setPercentCrop(meta?.percentCrop ?? null);
									setRemoveRequested(false);
								}}
								onRemove={() => {
									setSelectedFile(null);
									setImagePreview(null);
									setOriginalFile(null);
									setPercentCrop(null);
									setRemoveRequested(true);
								}}
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
						<div className="grid gap-2">
							<FormLabel>Trait ratings</FormLabel>
							<CharacterRatings characterId={characterId} />
						</div>
						<div className="sticky flex items-center justify-end gap-2 border-t bg-background pt-3">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
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
								{form.formState.isSubmitting || updateMutation.isPending
									? "Updating..."
									: "Update"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export default EditCharacterDialog;
