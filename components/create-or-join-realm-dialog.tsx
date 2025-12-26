"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, UserPlus } from "lucide-react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ImageUpload } from "@/components/image-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, realmMutations, realmQueries } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { uploadWithProgress } from "@/lib/utils";

const createRealmSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(50, "Name must be less than 50 characters"),
	description: z
		.string()
		.max(500, "Description must be less than 500 characters")
		.optional(),
	password: z
		.string()
		.max(32, "Password must be less than 32 characters")
		.optional(),
	templateRealmId: z.string().optional(),
});

const joinRealmSchema = z.object({
	realmId: z
		.string()
		.length(7, "Realm ID must be exactly 7 characters")
		.regex(/^[A-Za-z0-9]+$/, "Realm ID must contain only letters and numbers"),
	password: z
		.string()
		.max(32, "Password must be less than 32 characters")
		.optional(),
});

type CreateRealmFormData = z.infer<typeof createRealmSchema>;
type JoinRealmFormData = z.infer<typeof joinRealmSchema>;
type DialogView = "selection" | "create" | "join";

interface CreateOrJoinRealmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateOrJoinRealmDialog({
	open,
	onOpenChange,
}: CreateOrJoinRealmDialogProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [originalFile, setOriginalFile] = useState<File | null>(null);
	const [percentCrop, setPercentCrop] = useState<{
		unit?: string;
		x?: number;
		y?: number;
		width?: number;
		height?: number;
	} | null>(null);
	const [currentView, setCurrentView] = useState<DialogView>("selection");
	const [uploadProgress, setUploadProgress] = useState<number>(0);
	const [isUploading, setIsUploading] = useState<boolean>(false);

	const createForm = useForm<CreateRealmFormData>({
		resolver: zodResolver(createRealmSchema),
		defaultValues: {
			name: "",
			description: "",
			password: "",
			templateRealmId: "",
		},
	});

	const joinForm = useForm<JoinRealmFormData>({
		resolver: zodResolver(joinRealmSchema),
		defaultValues: { realmId: "", password: "" },
	});

	// Fetch user's realms for template selection
	const { data: userRealms } = useQuery({
		...realmQueries.list(),
		enabled: open && currentView === "create",
	});

	const createMutation = useMutation({
		mutationFn: (data: {
			name: string;
			description?: string;
			password?: string;
			templateRealmId?: string;
		}) => realmMutations.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.realm.list(),
			});
			toast.success("Realm created successfully!");
			handleClose();
		},
		onError: (err) => {
			console.error("Create realm error:", err);
			toast.error(err.message || "Failed to create realm");
		},
	});

	const joinMutation = useMutation({
		mutationFn: (data: { realmId: string; password?: string }) =>
			realmMutations.join(data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.realm.list(),
			});
			toast.success("Successfully joined realm!");
			handleClose();
		},
		onError: (err) => {
			console.error("Join realm error:", err);
			toast.error(err.message || "Failed to join realm");
		},
	});

	const handleRemoveIcon = useCallback(() => {
		setSelectedFile(null);
		setImagePreview(null);
		setOriginalFile(null);
		setPercentCrop(null);
	}, []);

	const uploadIcon = useCallback(
		async (
			realmId: string,
			file: File,
			original?: File | null,
			crop?: typeof percentCrop,
		): Promise<void> => {
			const formData = new FormData();
			// Prefer uploading the original with crop so server can process it
			if (original && crop) {
				formData.append("file", original);
				formData.append("crop", JSON.stringify(crop));
			} else {
				formData.append("file", file);
			}

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
		},
		[],
	);

	const handleClose = useCallback(() => {
		onOpenChange(false);
		createForm.reset();
		joinForm.reset();
		setSelectedFile(null);
		setImagePreview(null);
		setOriginalFile(null);
		setPercentCrop(null);
		setIsUploading(false);
		setUploadProgress(0);
		setCurrentView("selection");
	}, [onOpenChange, createForm, joinForm]);

	const handleBack = useCallback(() => {
		setCurrentView("selection");
		createForm.reset();
		joinForm.reset();
		handleRemoveIcon();
	}, [createForm, joinForm, handleRemoveIcon]);

	const onCreateSubmit = useCallback(
		async (data: CreateRealmFormData) => {
			try {
				// First create the realm
				const realm = await createMutation.mutateAsync({
					name: data.name.trim(),
					description: data.description?.trim() || undefined,
					password: data.password || undefined,
					templateRealmId: data.templateRealmId || undefined,
				});

				// Then upload the icon if a file was selected
				if (selectedFile && realm.id) {
					await uploadIcon(realm.id, selectedFile, originalFile, percentCrop);
					// Invalidate realm list to refresh sidebar
					queryClient.invalidateQueries({
						queryKey: queryKeys.realm.list(),
					});
				}

				// Show additional message if traits were copied
				if (data.templateRealmId) {
					toast.success("Traits copied from template realm!");
				}
			} catch (error) {
				console.error("Failed to create realm or upload icon:", error);
				// Error is already handled by mutation onError
			}
		},
		[createMutation, selectedFile, originalFile, percentCrop, uploadIcon],
	);

	const onJoinSubmit = useCallback(
		async (data: JoinRealmFormData) => {
			try {
				await joinMutation.mutateAsync({
					realmId: data.realmId.trim(),
					password: data.password || undefined,
				});
			} catch (error) {
				console.error("Failed to join realm:", error);
				// Error is already handled by mutation onError
			}
		},
		[joinMutation],
	);

	// Reset forms when dialog opens/closes
	const handleOpenChange = useCallback(
		(newOpen: boolean) => {
			if (!newOpen) {
				handleClose();
			} else {
				setCurrentView("selection");
			}
			onOpenChange(newOpen);
		},
		[handleClose, onOpenChange],
	);

	const getDialogTitle = () => {
		switch (currentView) {
			case "create":
				return "Create Realm";
			case "join":
				return "Join Realm";
			default:
				return "Add Realm";
		}
	};

	const getDialogDescription = () => {
		switch (currentView) {
			case "create":
				return "Set up a new realm for your community.";
			case "join":
				return "Enter a realm ID to join an existing community.";
			default:
				return "Create a new realm or join an existing one.";
		}
	};

	return (
		<ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="sm:max-w-lg">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>{getDialogTitle()}</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{getDialogDescription()}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<ResponsiveDialogBody>
					{currentView === "selection" && (
						<div className="grid gap-4">
							<button
								type="button"
								onClick={() => setCurrentView("create")}
								className="group flex items-start gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent"
							>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
									<Plus className="h-5 w-5" />
								</div>
								<div className="space-y-1">
									<h3 className="font-medium leading-none">Create a Realm</h3>
									<p className="text-muted-foreground text-sm">
										Start a new community and invite others to join
									</p>
								</div>
							</button>

							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<Separator className="w-full" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-background px-2 text-muted-foreground">
										or
									</span>
								</div>
							</div>

							<button
								type="button"
								onClick={() => setCurrentView("join")}
								className="group flex items-start gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent"
							>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
									<UserPlus className="h-5 w-5" />
								</div>
								<div className="space-y-1">
									<h3 className="font-medium leading-none">Join a Realm</h3>
									<p className="text-muted-foreground text-sm">
										Enter a realm ID to join an existing community
									</p>
								</div>
							</button>
						</div>
					)}

					{currentView === "create" && (
						<Form {...createForm}>
							<form
								onSubmit={createForm.handleSubmit(onCreateSubmit)}
								className="grid gap-4"
							>
								<FormField
									control={createForm.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input
													{...field}
													placeholder="Enter realm name"
													maxLength={50}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={createForm.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Description (optional)</FormLabel>
											<FormControl>
												<Textarea
													{...field}
													placeholder="Enter a description for this realm..."
													className="min-h-20 resize-none"
													maxLength={500}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={createForm.control}
									name="templateRealmId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Template Realm (optional)</FormLabel>
											<Select
												onValueChange={(value) =>
													field.onChange(value === "none" ? "" : value)
												}
												value={field.value || "none"}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select a realm to copy traits from" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="none">No template</SelectItem>
													{userRealms?.map((realm) => (
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
											<FormDescription>
												Copy traits from an existing realm you&apos;re a member
												of
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={createForm.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password (optional)</FormLabel>
											<FormControl>
												<Input
													type="password"
													{...field}
													placeholder="Enter password (min 4 characters)"
													maxLength={100}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<div className="grid gap-2">
									<FormLabel>Icon (optional)</FormLabel>
									<ImageUpload
										previewSrc={imagePreview || undefined}
										onSelect={(file, preview, meta) => {
											setSelectedFile(file);
											setImagePreview(preview);
											setOriginalFile(meta?.originalFile ?? null);
											setPercentCrop(meta?.percentCrop ?? null);
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
								<ResponsiveDialogFooter className="border-none p-0 pt-2">
									<Button
										variant="outline"
										type="button"
										onClick={handleBack}
										disabled={createMutation.isPending}
										className="w-full sm:w-auto"
									>
										Back
									</Button>
									<Button
										type="submit"
										disabled={
											createForm.formState.isSubmitting ||
											createMutation.isPending
										}
										className="w-full sm:w-auto"
									>
										{createMutation.isPending ? "Creating..." : "Create Realm"}
									</Button>
								</ResponsiveDialogFooter>
							</form>
						</Form>
					)}

					{currentView === "join" && (
						<Form {...joinForm}>
							<form
								onSubmit={joinForm.handleSubmit(onJoinSubmit)}
								className="grid gap-4"
							>
								<FormField
									control={joinForm.control}
									name="realmId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Realm ID</FormLabel>
											<FormControl>
												<Input
													{...field}
													placeholder="Enter 7-character realm ID"
													maxLength={7}
													className="text-center font-mono text-lg tracking-widest"
												/>
											</FormControl>
											<FormDescription>
												Ask the realm owner for this 7-character code
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={joinForm.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password (if required)</FormLabel>
											<FormControl>
												<Input
													type="password"
													{...field}
													placeholder="Enter password if the realm requires one"
													maxLength={100}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<ResponsiveDialogFooter className="border-none p-0 pt-2">
									<Button
										variant="outline"
										type="button"
										onClick={handleBack}
										disabled={joinMutation.isPending}
										className="w-full sm:w-auto"
									>
										Back
									</Button>
									<Button
										type="submit"
										disabled={
											joinForm.formState.isSubmitting || joinMutation.isPending
										}
										className="w-full sm:w-auto"
									>
										{joinMutation.isPending ? "Joining..." : "Join Realm"}
									</Button>
								</ResponsiveDialogFooter>
							</form>
						</Form>
					)}
				</ResponsiveDialogBody>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

export default CreateOrJoinRealmDialog;
