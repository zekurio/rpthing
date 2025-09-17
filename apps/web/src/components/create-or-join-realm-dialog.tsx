"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ImageUpload } from "@/components/image-upload";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, trpc } from "@/utils/trpc";

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
	const [activeTab, setActiveTab] = useState<"create" | "join">("create");

	const createForm = useForm<CreateRealmFormData>({
		resolver: zodResolver(createRealmSchema),
		defaultValues: { name: "", description: "", password: "" },
	});

	const joinForm = useForm<JoinRealmFormData>({
		resolver: zodResolver(joinRealmSchema),
		defaultValues: { realmId: "", password: "" },
	});

	// Memoize server URL to avoid recalculation
	const serverUrl = useMemo(() => process.env.NEXT_PUBLIC_SERVER_URL || "", []);

	const createMutation = useMutation({
		...trpc.realm.create.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trpc.realm.list.queryKey() });
			toast.success("Realm created successfully!");
			handleClose();
		},
		onError: (err) => {
			console.error("Create realm error:", err);
			toast.error(err.message || "Failed to create realm");
		},
	});

	const joinMutation = useMutation({
		...trpc.realm.join.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trpc.realm.list.queryKey() });
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
	}, []);

	const uploadFile = useCallback(
		async (realmId: string, file: File): Promise<void> => {
			const formData = new FormData();
			formData.append("file", file);

			try {
				const response = await fetch(
					`${serverUrl}/api/upload/realm-icon/${realmId}`,
					{
						method: "POST",
						body: formData,
						credentials: "include",
					},
				);

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || "Failed to upload icon");
				}
			} catch (error) {
				console.error("Upload error:", error);
				throw error;
			}
		},
		[serverUrl],
	);

	const handleClose = useCallback(() => {
		onOpenChange(false);
		createForm.reset();
		joinForm.reset();
		setSelectedFile(null);
		setImagePreview(null);
		setActiveTab("create");
	}, [onOpenChange, createForm, joinForm]);

	const onCreateSubmit = useCallback(
		async (data: CreateRealmFormData) => {
			try {
				// First create the realm
				const realm = await createMutation.mutateAsync({
					name: data.name.trim(),
					description: data.description?.trim() || undefined,
					password: data.password || undefined,
				});

				// Then upload the icon if a file was selected
				if (selectedFile && realm.id) {
					await uploadFile(realm.id, selectedFile);
					// Invalidate realm list to refresh sidebar
					queryClient.invalidateQueries({
						queryKey: trpc.realm.list.queryKey(),
					});
				}
			} catch (error) {
				console.error("Failed to create realm or upload icon:", error);
				// Error is already handled by mutation onError
			}
		},
		[createMutation, selectedFile, uploadFile],
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
				setActiveTab("create");
			}
			onOpenChange(newOpen);
		},
		[handleClose, onOpenChange],
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Realm Options</DialogTitle>
					<DialogDescription>
						Create a new realm or join an existing one.
					</DialogDescription>
				</DialogHeader>
				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as "create" | "join")}
					className="w-full"
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="create">Create</TabsTrigger>
						<TabsTrigger value="join">Join</TabsTrigger>
					</TabsList>
					<TabsContent value="create" className="mt-6">
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
													className="min-h-[80px] resize-none"
													maxLength={500}
												/>
											</FormControl>
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
										onSelect={(file, preview) => {
											setSelectedFile(file);
											setImagePreview(preview);
										}}
										onRemove={handleRemoveIcon}
									/>
								</div>
								<div className="flex items-center justify-end gap-2 pt-2">
									<Button
										variant="outline"
										type="button"
										onClick={handleClose}
										disabled={createMutation.isPending}
									>
										Cancel
									</Button>
									<Button
										type="submit"
										disabled={
											createForm.formState.isSubmitting ||
											createMutation.isPending
										}
									>
										{createMutation.isPending ? "Creating..." : "Create"}
									</Button>
								</div>
							</form>
						</Form>
					</TabsContent>
					<TabsContent value="join" className="mt-6">
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
													className="font-mono"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={joinForm.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password (optional)</FormLabel>
											<FormControl>
												<Input
													type="password"
													{...field}
													placeholder="Enter password if required"
													maxLength={100}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<div className="flex items-center justify-end gap-2 pt-2">
									<Button
										variant="outline"
										type="button"
										onClick={handleClose}
										disabled={joinMutation.isPending}
									>
										Cancel
									</Button>
									<Button
										type="submit"
										disabled={
											joinForm.formState.isSubmitting || joinMutation.isPending
										}
									>
										{joinMutation.isPending ? "Joining..." : "Join Realm"}
									</Button>
								</div>
							</form>
						</Form>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}

export default CreateOrJoinRealmDialog;
