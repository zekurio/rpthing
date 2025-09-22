"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
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
import { InlineLoading } from "@/components/ui/loading";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useRealmGenderOptions } from "@/hooks/use-realm-gender-options";
import { gradeForValue } from "@/lib/traits";
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

	const { data: traits, isLoading: traitsLoading } = useQuery({
		...trpc.trait.list.queryOptions({ realmId }),
		enabled: !!realmId && open,
	});

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
			setLocalRatings({});
			setSelectedFile(null);
			setImagePreview(null);
			setOriginalFile(null);
			setPercentCrop(null);
		},
		onError: (e) => toast.error(e.message || "Failed to create"),
	});

	const ratingsMutation = useMutation({
		...trpc.character.ratings.upsert.mutationOptions(),
		onError: (e) => toast.error(e.message || "Failed to save rating"),
	});

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

	const [localRatings, setLocalRatings] = React.useState<
		Record<string, number>
	>({});

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
				await fetch(`/api/upload/character-image/${created.id}`, {
					method: "POST",
					body: fd,
					credentials: "include",
				});
				queryClient.invalidateQueries({
					queryKey: trpc.character.list.queryKey({ realmId }),
				});
			}

			// Upsert initial ratings if any were set
			const entries = Object.entries(localRatings);
			if (entries.length > 0) {
				await Promise.all(
					entries.map(([traitId, value]) =>
						ratingsMutation.mutateAsync({
							characterId: created.id,
							traitId,
							value,
						}),
					),
				);
				queryClient.invalidateQueries({
					queryKey: trpc.character.getWithRatings.queryKey({ id: created.id }),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.character.list.queryKey({ realmId }),
				});
			}
		},
		[
			mutation,
			realmId,
			selectedFile,
			originalFile,
			percentCrop,
			localRatings,
			ratingsMutation,
		],
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
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="scrollbar-none grid max-h-[75vh] gap-4 overflow-y-auto px-1"
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
						<div className="grid gap-2">
							<FormLabel>Trait ratings</FormLabel>
							{traitsLoading ? (
								<InlineLoading text="Loading traits..." className="text-xs" />
							) : !traits || traits.length === 0 ? (
								<div className="rounded-md border p-3 text-muted-foreground text-sm">
									No traits in this realm yet.
								</div>
							) : (
								<div className="grid gap-4">
									{traits.map((t) => {
										const current = localRatings[t.id] ?? 10;
										const isSet = Object.hasOwn(localRatings, t.id);
										const label =
											t.displayMode === "grade"
												? gradeForValue(current)
												: String(current);
										return (
											<div key={t.id} className="grid gap-2">
												<div className="flex items-center justify-between gap-2">
													<div className="min-w-0">
														<div className="truncate font-medium text-sm">
															{t.name}
														</div>
														{t.description ? (
															<div className="truncate text-muted-foreground text-xs">
																{t.description}
															</div>
														) : null}
													</div>
													<div className="flex items-center gap-2">
														<span className="text-muted-foreground text-xs">
															{isSet ? label : "Not set"}
														</span>
														{isSet ? (
															<Button
																type="button"
																variant="ghost"
																size="sm"
																className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
																onClick={() =>
																	setLocalRatings((prev) => {
																		const { [t.id]: _omit, ...rest } =
																			prev as Record<string, number>;
																		return rest;
																	})
																}
																aria-label="Clear rating"
															>
																<X className="h-3 w-3" />
															</Button>
														) : null}
													</div>
												</div>
												<Slider
													min={1}
													max={20}
													step={1}
													value={[current]}
													onValueChange={(vals) => {
														const v = vals[0] ?? 10;
														setLocalRatings((prev) => ({ ...prev, [t.id]: v }));
													}}
												/>
											</div>
										);
									})}
								</div>
							)}
						</div>
						<div className="sticky flex items-center justify-end gap-2 border-t bg-background pt-3">
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
								{form.formState.isSubmitting || mutation.isPending
									? "Creating..."
									: "Create"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
