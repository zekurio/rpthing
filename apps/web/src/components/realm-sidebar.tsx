"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Edit, Plus, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateRealmDialog } from "@/components/create-realm-dialog";
import { EditRealmDialog } from "@/components/edit-realm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { queryClient, trpc } from "@/utils/trpc";

export function RealmSidebar() {
	const router = useRouter();
	const { data, isPending } = useQuery(trpc.realm.list.queryOptions());

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [selectedRealmId, setSelectedRealmId] = useState<string | null>(null);

	const realms = data ?? [];

	const serverUrl = useMemo(() => process.env.NEXT_PUBLIC_SERVER_URL || "", []);

	const deleteMutation = useMutation({
		...trpc.realm.delete.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries();
			toast.success("Realm deleted.");
		},
		onError: (err) => toast.error(err.message),
	});

	const handleEdit = (realmId: string) => {
		setSelectedRealmId(realmId);
		setEditDialogOpen(true);
	};

	const handleDelete = async (realmId: string) => {
		if (
			confirm(
				"Are you sure you want to delete this realm? This action cannot be undone.",
			)
		) {
			await deleteMutation.mutateAsync(realmId);
		}
	};

	const handleRealmClick = (realmId: string) => {
		router.push(`/realms/${realmId}`);
	};

	return (
		<TooltipProvider>
			<aside className="flex h-full w-20 shrink-0 flex-col items-center gap-3 border-r bg-background py-4">
				<div className="flex flex-1 flex-col items-center gap-3 overflow-y-auto">
					{isPending ? (
						<div className="h-12 w-12 animate-pulse rounded-full bg-accent" />
					) : (
						realms.map((r) => {
							const src = r.iconKey ? `${serverUrl}${r.iconKey}` : undefined;
							return (
								<ContextMenu key={r.id}>
									<ContextMenuTrigger asChild>
										<div className="group relative">
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														className="group/realm"
														type="button"
														onClick={() => handleRealmClick(r.id)}
													>
														<Avatar className="h-12 w-12">
															<AvatarImage src={src || ""} alt={r.name} />
															<AvatarFallback className="rounded-full">
																{r.name?.[0]?.toUpperCase() || "R"}
															</AvatarFallback>
														</Avatar>
													</button>
												</TooltipTrigger>
												<TooltipContent side="right">
													<p>{r.name}</p>
												</TooltipContent>
											</Tooltip>
										</div>
									</ContextMenuTrigger>
									<ContextMenuContent>
										<ContextMenuItem onClick={() => handleEdit(r.id)}>
											<Edit className="mr-2 h-4 w-4" />
											Edit
										</ContextMenuItem>
										<ContextMenuItem
											onClick={() => handleDelete(r.id)}
											className="text-destructive focus:text-destructive"
										>
											<Trash className="mr-2 h-4 w-4" />
											Delete
										</ContextMenuItem>
									</ContextMenuContent>
								</ContextMenu>
							);
						})
					)}
				</div>
				<div className="mt-auto">
					<Button
						size="icon"
						variant="ghost"
						className="h-12 w-12 rounded-full"
						onClick={() => setDialogOpen(true)}
					>
						<Plus />
					</Button>
				</div>
				<CreateRealmDialog open={dialogOpen} onOpenChange={setDialogOpen} />
				<EditRealmDialog
					open={editDialogOpen}
					onOpenChange={setEditDialogOpen}
					realmId={selectedRealmId}
				/>
			</aside>
		</TooltipProvider>
	);
}

export default RealmSidebar;
