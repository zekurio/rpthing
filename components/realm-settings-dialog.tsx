"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	Crown,
	Loader2,
	MoreVertical,
	Plus,
	Settings,
	Sparkles,
	Users,
	X,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ImageUpload } from "@/components/image-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/components/ui/responsive-alert-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, trpc } from "@/lib/trpc";
import { uploadWithProgress } from "@/lib/utils";

type SettingsSection = "overview" | "members" | "traits";

const editRealmSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	password: z.string().optional(),
});

type EditRealmFormData = z.infer<typeof editRealmSchema>;

const createTraitSchema = z.object({
	name: z.string().min(1, "Name is required").max(100),
	description: z.string().max(2000).optional(),
	displayMode: z.enum(["number", "grade"]),
});

type CreateTraitFormData = z.infer<typeof createTraitSchema>;

const editTraitSchema = z.object({
	name: z.string().min(1, "Name is required").max(100),
	description: z.string().max(2000).optional(),
	displayMode: z.enum(["number", "grade"]),
});

type EditTraitFormData = z.infer<typeof editTraitSchema>;

interface RealmSettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	realmId: string | null;
	realmName?: string;
	currentUserId?: string;
}

// Overview Section Component
function OverviewSection({ realmId }: { realmId: string }) {
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
	const [removeIcon, setRemoveIcon] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [clearPassword, setClearPassword] = useState(false);

	const { data: realm, isLoading } = useQuery({
		...trpc.realm.getById.queryOptions({ realmId }),
		enabled: !!realmId,
	});

	const form = useForm<EditRealmFormData>({
		resolver: zodResolver(editRealmSchema),
		defaultValues: { name: "", description: "", password: "" },
	});

	const updateMutation = useMutation({
		...trpc.realm.update.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.realm.list.queryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: trpc.realm.getById.queryKey({ realmId }),
			});
			toast.success("Realm updated.");
		},
		onError: (err) => toast.error(err.message),
	});

	const currentIconSrc = realm?.iconKey || null;

	useEffect(() => {
		if (realm) {
			form.reset({
				name: realm.name || "",
				description: realm.description || "",
				password: "",
			});
			setSelectedFile(null);
			setImagePreview(null);
			setOriginalFile(null);
			setPercentCrop(null);
			setRemoveIcon(false);
			setClearPassword(false);
		}
	}, [realm, form]);

	const uploadIcon = async (
		realmId: string,
		file: File,
		original?: File | null,
		crop?: typeof percentCrop,
	): Promise<void> => {
		const formData = new FormData();
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
		setOriginalFile(null);
		setPercentCrop(null);
		setRemoveIcon(true);
	};

	const onSubmit = async (data: EditRealmFormData) => {
		try {
			// If clearing password, send empty string; if setting new password, send it; otherwise undefined to keep current
			const passwordValue = clearPassword ? "" : data.password || undefined;

			await updateMutation.mutateAsync({
				id: realmId,
				name: data.name,
				description: data.description || undefined,
				password: passwordValue,
			});

			if (selectedFile) {
				await uploadIcon(realmId, selectedFile, originalFile, percentCrop);
				queryClient.invalidateQueries({
					queryKey: trpc.realm.list.queryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.realm.getById.queryKey({ realmId }),
				});
			} else if (removeIcon && currentIconSrc) {
				await deleteIcon(realmId);
				queryClient.invalidateQueries({
					queryKey: trpc.realm.list.queryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.realm.getById.queryKey({ realmId }),
				});
			}
		} catch (error) {
			console.error("Failed to update realm:", error);
		}
	};

	if (isLoading) {
		return (
			<div className="flex h-32 items-center justify-center">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Textarea
									{...field}
									placeholder="Enter a description..."
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
							<div className="flex items-center justify-between">
								<FormLabel>Password</FormLabel>
								{realm?.hasPassword && !clearPassword && (
									<span className="text-muted-foreground text-xs">
										Password set
									</span>
								)}
								{clearPassword && (
									<span className="text-muted-foreground text-xs">
										Will be cleared
									</span>
								)}
							</div>
							<FormControl>
								<div className="flex gap-2">
									<Input
										type="password"
										{...field}
										placeholder={
											clearPassword
												? "Password will be cleared"
												: realm?.hasPassword
													? "Enter new password to change"
													: "Set a password"
										}
										disabled={clearPassword}
										className={clearPassword ? "opacity-50" : undefined}
									/>
									{realm?.hasPassword && !clearPassword && (
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={() => {
												setClearPassword(true);
												field.onChange("");
											}}
											title="Clear password"
										>
											<X className="h-4 w-4" />
										</Button>
									)}
									{clearPassword && (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setClearPassword(false)}
										>
											Undo
										</Button>
									)}
								</div>
							</FormControl>
							<FormDescription>
								{clearPassword
									? "The password will be removed when you save."
									: realm?.hasPassword
										? "Enter a new password to change it, or clear it to make the realm public."
										: "Set a password to make this realm private."}
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="space-y-2">
					<FormLabel>Icon</FormLabel>
					<ImageUpload
						previewSrc={
							removeIcon
								? undefined
								: imagePreview || currentIconSrc || undefined
						}
						onSelect={(file, preview, meta) => {
							setSelectedFile(file);
							setImagePreview(preview);
							setOriginalFile(meta?.originalFile ?? null);
							setPercentCrop(meta?.percentCrop ?? null);
							setRemoveIcon(false);
						}}
						onRemove={handleRemoveIcon}
					/>
					{isUploading && (
						<div className="flex items-center gap-2">
							<Progress value={uploadProgress} className="h-2 w-32" />
							<span className="text-muted-foreground text-xs">
								{Math.max(0, Math.round(uploadProgress))}%
							</span>
						</div>
					)}
				</div>
				<div className="flex justify-end pt-2">
					<Button
						type="submit"
						disabled={form.formState.isSubmitting || updateMutation.isPending}
					>
						{updateMutation.isPending ? "Saving..." : "Save"}
					</Button>
				</div>
			</form>
		</Form>
	);
}

// Members Section Component
function MembersSection({
	realmId,
	currentUserId,
	isOwner,
}: {
	realmId: string;
	currentUserId?: string;
	isOwner: boolean;
}) {
	const [transferDialogOpen, setTransferDialogOpen] = useState(false);
	const [selectedMember, setSelectedMember] = useState<{
		userId: string;
		name: string | null;
	} | null>(null);

	const { data: members, isLoading } = useQuery({
		...trpc.realm.getMembers.queryOptions({ realmId }),
		enabled: !!realmId,
	});

	const transferMutation = useMutation({
		...trpc.realm.transferOwnership.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.realm.getMembers.queryKey({ realmId }),
			});
			queryClient.invalidateQueries({
				queryKey: trpc.realm.list.queryKey(),
			});
			toast.success("Ownership transferred successfully.");
			setTransferDialogOpen(false);
		},
		onError: (err) => toast.error(err.message),
	});

	const handleTransferOwnership = (member: {
		userId: string;
		name: string | null;
	}) => {
		setSelectedMember(member);
		setTransferDialogOpen(true);
	};

	const confirmTransfer = async () => {
		if (!selectedMember) return;
		await transferMutation.mutateAsync({
			realmId,
			newOwnerUserId: selectedMember.userId,
		});
	};

	if (isLoading) {
		return (
			<div className="flex h-32 items-center justify-center">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<p className="text-muted-foreground text-xs">
				{members?.length || 0} member{members?.length !== 1 ? "s" : ""}
			</p>
			<div className="max-h-[280px] space-y-1.5 overflow-y-auto">
				{members?.map((member) => (
					<div
						key={member.userId}
						className="flex items-center justify-between rounded-md border p-2"
					>
						<div className="flex items-center gap-2">
							<Avatar className="h-8 w-8">
								<AvatarImage src={member.image || undefined} />
								<AvatarFallback className="text-xs">
									{member.name?.[0]?.toUpperCase() || "?"}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0">
								<div className="flex items-center gap-1.5">
									<span className="truncate font-medium text-sm">
										{member.name || "Unknown"}
									</span>
									{member.role === "owner" && (
										<Badge
											variant="secondary"
											className="gap-0.5 px-1 py-0 text-[10px]"
										>
											<Crown className="h-2.5 w-2.5" />
											Owner
										</Badge>
									)}
								</div>
								<span className="truncate text-muted-foreground text-xs">
									{member.email}
								</span>
							</div>
						</div>
						{isOwner && member.userId !== currentUserId && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="h-7 w-7">
										<MoreVertical className="h-3.5 w-3.5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() =>
											handleTransferOwnership({
												userId: member.userId,
												name: member.name,
											})
										}
									>
										Transfer ownership
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				))}
			</div>

			{/* Transfer Ownership Dialog */}
			<ResponsiveAlertDialog
				open={transferDialogOpen}
				onOpenChange={setTransferDialogOpen}
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							Transfer Ownership
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							Are you sure you want to transfer ownership to{" "}
							{selectedMember?.name || "this member"}? You will lose owner
							privileges.
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							onClick={confirmTransfer}
							disabled={transferMutation.isPending}
						>
							{transferMutation.isPending ? "Transferring..." : "Transfer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</div>
	);
}

// Traits Section Component
function TraitsSection({ realmId }: { realmId: string }) {
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedTrait, setSelectedTrait] = useState<{
		id: string;
		name: string;
		description?: string | null;
		displayMode: "number" | "grade";
	} | null>(null);

	const { data: traits, isLoading } = useQuery({
		...trpc.trait.list.queryOptions({ realmId }),
		enabled: !!realmId,
	});

	const createForm = useForm<CreateTraitFormData>({
		resolver: zodResolver(createTraitSchema),
		defaultValues: { name: "", description: "", displayMode: "grade" },
	});

	const editForm = useForm<EditTraitFormData>({
		resolver: zodResolver(editTraitSchema),
		defaultValues: { name: "", description: "", displayMode: "grade" },
	});

	const createMutation = useMutation({
		...trpc.trait.create.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.trait.list.queryKey({ realmId }),
			});
			toast.success("Trait created.");
			setCreateDialogOpen(false);
			createForm.reset();
		},
		onError: (err) => toast.error(err.message),
	});

	const updateMutation = useMutation({
		...trpc.trait.update.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.trait.list.queryKey({ realmId }),
			});
			toast.success("Trait updated.");
			setEditDialogOpen(false);
		},
		onError: (err) => toast.error(err.message),
	});

	const deleteMutation = useMutation({
		...trpc.trait.delete.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.trait.list.queryKey({ realmId }),
			});
			toast.success("Trait deleted.");
			setDeleteDialogOpen(false);
		},
		onError: (err) => toast.error(err.message),
	});

	const handleEditTrait = (trait: {
		id: string;
		name: string;
		description?: string | null;
		displayMode: "number" | "grade";
	}) => {
		setSelectedTrait(trait);
		editForm.reset({
			name: trait.name,
			description: trait.description || "",
			displayMode: trait.displayMode,
		});
		setEditDialogOpen(true);
	};

	const handleDeleteTrait = (trait: { id: string; name: string }) => {
		setSelectedTrait({
			...trait,
			description: null,
			displayMode: "grade",
		});
		setDeleteDialogOpen(true);
	};

	const onCreateSubmit = async (data: CreateTraitFormData) => {
		await createMutation.mutateAsync({
			realmId,
			name: data.name,
			description: data.description || undefined,
			displayMode: data.displayMode,
		});
	};

	const onEditSubmit = async (data: EditTraitFormData) => {
		if (!selectedTrait) return;
		await updateMutation.mutateAsync({
			id: selectedTrait.id,
			name: data.name,
			description: data.description || undefined,
			displayMode: data.displayMode,
		});
	};

	const confirmDelete = async () => {
		if (!selectedTrait) return;
		await deleteMutation.mutateAsync(selectedTrait.id);
	};

	if (isLoading) {
		return (
			<div className="flex h-32 items-center justify-center">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col space-y-3">
			<div className="flex shrink-0 items-center justify-between">
				<p className="text-muted-foreground text-xs">
					{traits?.length || 0} trait{traits?.length !== 1 ? "s" : ""}
				</p>
				<Button size="sm" onClick={() => setCreateDialogOpen(true)}>
					<Plus className="mr-1 h-3.5 w-3.5" />
					Add
				</Button>
			</div>
			{traits?.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-md border border-dashed py-8 text-center">
					<Sparkles className="mb-2 h-8 w-8 text-muted-foreground/50" />
					<p className="font-medium text-sm">No traits yet</p>
					<p className="mt-0.5 text-muted-foreground text-xs">
						Create traits to rate characters
					</p>
				</div>
			) : (
				<div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
					{traits?.map((trait) => (
						<div
							key={trait.id}
							className="flex items-center justify-between rounded-md border p-2"
						>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5">
									<span className="truncate font-medium text-sm">
										{trait.name}
									</span>
									<Badge variant="outline" className="shrink-0 text-[10px]">
										{trait.displayMode === "grade" ? "Grade" : "Number"}
									</Badge>
								</div>
								{trait.description && (
									<p className="truncate text-muted-foreground text-xs">
										{trait.description}
									</p>
								)}
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="ml-1 h-7 w-7">
										<MoreVertical className="h-3.5 w-3.5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() =>
											handleEditTrait({
												id: trait.id,
												name: trait.name,
												description: trait.description,
												displayMode: trait.displayMode,
											})
										}
									>
										Edit
									</DropdownMenuItem>
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onClick={() =>
											handleDeleteTrait({ id: trait.id, name: trait.name })
										}
									>
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					))}
				</div>
			)}

			{/* Create Trait Dialog */}
			<ResponsiveDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
			>
				<ResponsiveDialogContent>
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle>Create Trait</ResponsiveDialogTitle>
						<ResponsiveDialogDescription>
							Add a new trait for rating characters
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>
					<ResponsiveDialogBody>
						<Form {...createForm}>
							<form
								id="create-trait-form"
								onSubmit={createForm.handleSubmit(onCreateSubmit)}
								className="space-y-3"
							>
								<FormField
									control={createForm.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-xs">Name</FormLabel>
											<FormControl>
												<Input
													{...field}
													placeholder="e.g., Strength"
													className="h-8"
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
											<FormLabel className="text-xs">Description</FormLabel>
											<FormControl>
												<Textarea
													{...field}
													placeholder="Describe what this trait represents..."
													className="min-h-[60px] resize-none text-sm"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={createForm.control}
									name="displayMode"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-xs">Display Mode</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger className="h-8">
														<SelectValue placeholder="Select display mode" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="grade">Grade (F to Z)</SelectItem>
													<SelectItem value="number">Number (1-20)</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</form>
						</Form>
					</ResponsiveDialogBody>
					<ResponsiveDialogFooter>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCreateDialogOpen(false)}
							className="w-full sm:w-auto"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							form="create-trait-form"
							disabled={createMutation.isPending}
							className="w-full sm:w-auto"
						>
							{createMutation.isPending ? "Creating..." : "Create"}
						</Button>
					</ResponsiveDialogFooter>
				</ResponsiveDialogContent>
			</ResponsiveDialog>

			{/* Edit Trait Dialog */}
			<ResponsiveDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<ResponsiveDialogContent>
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle>Edit Trait</ResponsiveDialogTitle>
						<ResponsiveDialogDescription>
							Update the trait details
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>
					<ResponsiveDialogBody>
						<Form {...editForm}>
							<form
								id="edit-trait-form"
								onSubmit={editForm.handleSubmit(onEditSubmit)}
								className="space-y-3"
							>
								<FormField
									control={editForm.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-xs">Name</FormLabel>
											<FormControl>
												<Input {...field} className="h-8" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={editForm.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-xs">Description</FormLabel>
											<FormControl>
												<Textarea
													{...field}
													className="min-h-[60px] resize-none text-sm"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={editForm.control}
									name="displayMode"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-xs">Display Mode</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
											>
												<FormControl>
													<SelectTrigger className="h-8">
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="grade">Grade (F to Z)</SelectItem>
													<SelectItem value="number">Number (1-20)</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</form>
						</Form>
					</ResponsiveDialogBody>
					<ResponsiveDialogFooter>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setEditDialogOpen(false)}
							className="w-full sm:w-auto"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							form="edit-trait-form"
							disabled={updateMutation.isPending}
							className="w-full sm:w-auto"
						>
							{updateMutation.isPending ? "Saving..." : "Save"}
						</Button>
					</ResponsiveDialogFooter>
				</ResponsiveDialogContent>
			</ResponsiveDialog>

			{/* Delete Trait Dialog */}
			<ResponsiveAlertDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							Delete Trait
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							Are you sure you want to delete "{selectedTrait?.name}"? This will
							remove all ratings associated with this trait.
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							onClick={confirmDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</div>
	);
}

export function RealmSettingsDialog({
	open,
	onOpenChange,
	realmId,
	realmName,
	currentUserId,
}: RealmSettingsDialogProps) {
	const [activeTab, setActiveTab] = useState<SettingsSection>("overview");

	const { data: realm } = useQuery({
		...trpc.realm.getById.queryOptions({ realmId: realmId ?? "" }),
		enabled: !!realmId && open,
	});

	const isOwner = realm?.ownerId === currentUserId;

	// Reset to overview when dialog opens
	useEffect(() => {
		if (open) {
			setActiveTab("overview");
		}
	}, [open]);

	if (!realmId) return null;

	return (
		<ResponsiveDialog open={open} onOpenChange={onOpenChange}>
			<ResponsiveDialogContent className="max-w-lg">
				<ResponsiveDialogHeader className="pb-0">
					<ResponsiveDialogTitle className="text-base">
						{realmName || "Realm"} Settings
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription className="sr-only">
						Configure realm settings
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<ResponsiveDialogBody className="h-[580px] px-4 pb-4 sm:px-6 sm:pb-6">
					<Tabs
						value={activeTab}
						onValueChange={(v) => setActiveTab(v as SettingsSection)}
						className="flex h-full flex-col"
					>
						<TabsList className="w-full">
							<TabsTrigger value="overview" className="flex-1 gap-1.5">
								<Settings className="h-3.5 w-3.5" />
								<span className="hidden sm:inline">Overview</span>
							</TabsTrigger>
							<TabsTrigger value="members" className="flex-1 gap-1.5">
								<Users className="h-3.5 w-3.5" />
								<span className="hidden sm:inline">Members</span>
							</TabsTrigger>
							<TabsTrigger value="traits" className="flex-1 gap-1.5">
								<Sparkles className="h-3.5 w-3.5" />
								<span className="hidden sm:inline">Traits</span>
							</TabsTrigger>
						</TabsList>
						<TabsContent
							value="overview"
							className="mt-4 min-h-0 flex-1 overflow-y-auto"
						>
							<OverviewSection realmId={realmId} />
						</TabsContent>
						<TabsContent
							value="members"
							className="mt-4 min-h-0 flex-1 overflow-y-auto"
						>
							<MembersSection
								realmId={realmId}
								currentUserId={currentUserId}
								isOwner={isOwner}
							/>
						</TabsContent>
						<TabsContent
							value="traits"
							className="mt-4 min-h-0 flex-1 overflow-y-auto"
						>
							<TraitsSection realmId={realmId} />
						</TabsContent>
					</Tabs>
				</ResponsiveDialogBody>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
