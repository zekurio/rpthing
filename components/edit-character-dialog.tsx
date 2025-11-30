"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CharacterRatings } from "@/components/character-ratings";
import { ImageUpload } from "@/components/image-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InlineLoading } from "@/components/ui/loading";
import { Progress } from "@/components/ui/progress";
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
import { useRealmGenderOptions } from "@/hooks/use-realm-gender-options";
import { queryClient, trpc } from "@/lib/trpc";
import { uploadWithProgress } from "@/lib/utils";

const editCharacterSchema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	gender: z.string().max(50).optional(),
	notes: z.string().max(10000).optional(),
	realmId: z.string().min(1, "Realm is required"),
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

	const form = useForm<EditCharacterFormData>({
		resolver: zodResolver(editCharacterSchema),
		defaultValues: { name: "", gender: "", notes: "", realmId: "" },
	});

	const { data: character } = useQuery({
		...trpc.character.getById.queryOptions({ id: characterId }),
		enabled: !!characterId && open,
		retry: 2,
		retryDelay: 1000,
	});

	const { data: realms, isLoading: realmsLoading } = useQuery({
		...trpc.realm.list.queryOptions(),
		enabled: open,
	});

	const selectedRealmId = form.watch("realmId") || character?.realmId || "";
	const genderOptions = useRealmGenderOptions(selectedRealmId);

	const updateMutation = useMutation({
		...trpc.character.update.mutationOptions(),
		onError: (err) => toast.error(err.message),
	});

	useEffect(() => {
		if (character && open) {
			form.reset({
				name: character.name || "",
				gender: character.gender || "",
				notes: character.notes || "",
				realmId: character.realmId || "",
			});
			setSelectedFile(null);
			setImagePreview(null);
			setOriginalFile(null);
			setPercentCrop(null);
			setRemoveRequested(false);
		}
	}, [character, open, form]);

	const onSubmit = async (data: EditCharacterFormData) => {
		if (!characterId) return;

		const realmChanged = data.realmId !== character?.realmId;

		const result = await updateMutation.mutateAsync({
			id: characterId,
			name: data.name,
			gender: data.gender || undefined,
			notes: (data.notes?.trim() ?? "") === "" ? null : data.notes?.trim(),
			realmId: realmChanged ? data.realmId : undefined,
		});

		// Invalidate queries
		queryClient.invalidateQueries({
			queryKey: trpc.character.list.queryKey(),
		});
		queryClient.invalidateQueries({
			queryKey: trpc.character.getById.queryKey({ id: characterId }),
		});

		// If realm changed, invalidate both realms' character lists
		if (realmChanged && character?.realmId) {
			queryClient.invalidateQueries({
				queryKey: trpc.character.list.queryKey({ realmId: character.realmId }),
			});
			queryClient.invalidateQueries({
				queryKey: trpc.character.list.queryKey({ realmId: data.realmId }),
			});

			// Show notification about unmapped traits
			if (result.unmappedTraits && result.unmappedTraits.length > 0) {
				const traitList = result.unmappedTraits.join(", ");
				toast.warning(
					`Character moved, but the following trait ratings could not be mapped to the new realm: ${traitList}`,
					{ duration: 8000 },
				);
			} else {
				toast.success("Character updated and moved to new realm.");
			}
		} else {
			toast.success("Character updated.");
		}

		onChanged?.();

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
					url: `/api/upload/character-image/${characterId}`,
					formData: fd,
					onProgress: (p) => setUploadProgress(p < 0 ? 0 : p),
					withCredentials: true,
				});
				if (!response.ok) {
					throw new Error("Failed to upload character image");
				}
				queryClient.invalidateQueries({
					queryKey: trpc.character.getById.queryKey({
						id: characterId,
					}),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.character.list.queryKey(),
				});
			} else if (removeRequested && character?.referenceImageKey) {
				await fetch(`/api/upload/character-image/${characterId}`, {
					method: "DELETE",
					credentials: "include",
				});
				queryClient.invalidateQueries({
					queryKey: trpc.character.getById.queryKey({
						id: characterId,
					}),
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

		onClose();
	};

	const onClose = () => {
		form.reset();
		setSelectedFile(null);
		setImagePreview(null);
		setOriginalFile(null);
		setPercentCrop(null);
		setRemoveRequested(false);
		onOpenChange(false);
	};

	if (!characterId) return null;

	return (
		<ResponsiveDialog open={open} onOpenChange={onOpenChange}>
			<ResponsiveDialogContent>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Edit character</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Update the character details below.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<ResponsiveDialogBody>
					<Form {...form}>
						<form
							id="edit-character-form"
							onSubmit={form.handleSubmit(onSubmit)}
							className="grid gap-4"
						>
							<FormField
								control={form.control}
								name="realmId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Realm</FormLabel>
										{realmsLoading ? (
											<InlineLoading
												text="Loading realms..."
												className="text-xs"
											/>
										) : !realms || realms.length === 0 ? (
											<div className="rounded-md border p-3 text-muted-foreground text-sm">
												No realms available.
											</div>
										) : (
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select a realm..." />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{realms.map((realm) => (
														<SelectItem key={realm.id} value={realm.id}>
															<div className="flex items-center gap-2">
																<Avatar className="h-5 w-5">
																	{realm.iconKey ? (
																		<AvatarImage
																			src={realm.iconKey}
																			alt={realm.name || "Realm icon"}
																		/>
																	) : null}
																	<AvatarFallback className="text-[10px]">
																		{(realm.name || "R")
																			.charAt(0)
																			.toUpperCase()}
																	</AvatarFallback>
																</Avatar>
																<span>{realm.name}</span>
															</div>
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
										<FormMessage />
									</FormItem>
								)}
							/>
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
												character?.croppedImageKey ??
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
						</form>
					</Form>
				</ResponsiveDialogBody>
				<ResponsiveDialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={updateMutation.isPending}
						className="w-full sm:w-auto"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						form="edit-character-form"
						disabled={form.formState.isSubmitting || updateMutation.isPending}
						className="w-full sm:w-auto"
					>
						{form.formState.isSubmitting || updateMutation.isPending
							? "Updating..."
							: "Update"}
					</Button>
				</ResponsiveDialogFooter>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

export default EditCharacterDialog;
