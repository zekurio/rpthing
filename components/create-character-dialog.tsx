"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useRealmGenderOptions } from "@/hooks/use-realm-gender-options";
import { gradeForValue } from "@/lib/traits";
import { queryClient, trpc } from "@/lib/trpc";

const formSchema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	gender: z.string().max(50).optional(),
	notes: z.string().max(10000).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateCharacterDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	realmId?: string;
	onCreated: () => void;
}

export function CreateCharacterDialog({
	open,
	onOpenChange,
	realmId: initialRealmId,
	onCreated,
}: CreateCharacterDialogProps) {
	const [selectedRealmId, setSelectedRealmId] = React.useState<string>(
		initialRealmId ?? "",
	);

	// Use the initial realmId if provided, otherwise use the selected one
	const realmId = initialRealmId ?? selectedRealmId;

	// Fetch realms for the selector (only when no initial realmId is provided)
	const { data: realms, isLoading: realmsLoading } = useQuery({
		...trpc.realm.list.queryOptions(),
		enabled: !initialRealmId && open,
	});

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
			// Reset selected realm if no initial realmId was provided
			if (!initialRealmId) {
				setSelectedRealmId("");
			}
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

	// Reset local ratings when realm changes
	const prevRealmIdRef = React.useRef(realmId);
	React.useEffect(() => {
		if (prevRealmIdRef.current !== realmId) {
			setLocalRatings({});
			prevRealmIdRef.current = realmId;
		}
	}, [realmId]);

	const onSubmit = React.useCallback(
		async (data: FormData) => {
			if (!realmId) {
				toast.error("Please select a realm");
				return;
			}

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
					queryKey: trpc.character.getWithRatings.queryKey({
						id: created.id,
					}),
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
		<ResponsiveDialog open={open} onOpenChange={onOpenChange}>
			<ResponsiveDialogContent>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>New Character</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{initialRealmId
							? "Create a character for this realm."
							: "Create a character in one of your realms."}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<ResponsiveDialogBody>
					<Form {...form}>
						<form
							id="create-character-form"
							onSubmit={form.handleSubmit(onSubmit)}
							className="grid gap-4"
						>
							{/* Realm selector - only shown when no initial realmId */}
							{!initialRealmId && (
								<div className="grid gap-2">
									<FormLabel>Realm</FormLabel>
									{realmsLoading ? (
										<InlineLoading
											text="Loading realms..."
											className="text-xs"
										/>
									) : !realms || realms.length === 0 ? (
										<div className="rounded-sm border border-border p-3 text-muted-foreground text-sm">
											You need to join or create a realm first.
										</div>
									) : (
										<Select
											value={selectedRealmId}
											onValueChange={setSelectedRealmId}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select a realm..." />
											</SelectTrigger>
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
																	{(realm.name || "R").charAt(0).toUpperCase()}
																</AvatarFallback>
															</Avatar>
															<span>{realm.name}</span>
														</div>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								</div>
							)}
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
								{!realmId ? (
									<div className="rounded-sm border border-border p-3 text-muted-foreground text-sm">
										Select a realm to see available traits.
									</div>
								) : traitsLoading ? (
									<InlineLoading text="Loading traits..." className="text-xs" />
								) : !traits || traits.length === 0 ? (
									<div className="rounded-sm border border-border p-3 text-muted-foreground text-sm">
										No traits in this realm yet.
									</div>
								) : (
									<div className="grid gap-2">
										{traits.map((t) => {
											const current = localRatings[t.id] ?? 10;
											const isSet = Object.hasOwn(localRatings, t.id);
											const isGrade = t.displayMode === "grade";
											const displayValue = isGrade
												? gradeForValue(current)
												: String(current);
											return (
												<div
													key={t.id}
													className="rounded-sm border border-border px-3 py-2"
												>
													<div className="mb-2 flex items-center justify-between gap-2">
														<div className="min-w-0 flex-1">
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
															<span className="min-w-[2.5rem] text-right font-medium text-sm tabular-nums">
																{isSet ? displayValue : "—"}
															</span>
															{isSet ? (
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
																	onClick={() => {
																		setLocalRatings((prev) => {
																			const { [t.id]: _omit, ...rest } =
																				prev as Record<string, number>;
																			return rest;
																		});
																	}}
																	aria-label="Clear rating"
																>
																	<X className="h-3 w-3" />
																</Button>
															) : (
																<div className="h-6 w-6" />
															)}
														</div>
													</div>
													<Slider
														value={[current]}
														min={1}
														max={20}
														step={1}
														onValueChange={(values) => {
															const value = values[0];
															if (value >= 1 && value <= 20) {
																setLocalRatings((prev) => ({
																	...prev,
																	[t.id]: value,
																}));
															}
														}}
														className="w-full"
													/>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</form>
					</Form>
				</ResponsiveDialogBody>
				<ResponsiveDialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={mutation.isPending}
						className="w-full sm:w-auto"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						form="create-character-form"
						disabled={
							form.formState.isSubmitting ||
							mutation.isPending ||
							(!initialRealmId && !selectedRealmId)
						}
						className="w-full sm:w-auto"
					>
						{form.formState.isSubmitting || mutation.isPending
							? "Creating..."
							: "Create"}
					</Button>
				</ResponsiveDialogFooter>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
