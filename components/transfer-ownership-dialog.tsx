"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { queryClient, trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface TransferOwnershipDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	realmId: string | null;
	realmName?: string;
	currentRealmId?: string | null;
}

export function TransferOwnershipDialog({
	open,
	onOpenChange,
	realmId,
	realmName,
	currentRealmId,
}: TransferOwnershipDialogProps) {
	const router = useRouter();
	const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

	const { data: members, isLoading } = useQuery({
		...trpc.realm.getMembers.queryOptions(
			{ realmId: realmId ?? "" },
			{ enabled: !!realmId && open },
		),
	});

	const leaveMutation = useMutation({
		...trpc.realm.leave.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trpc.realm.list.queryKey() });
			toast.success("Ownership transferred and left realm successfully.");
			onOpenChange(false);

			if (realmId && currentRealmId && realmId === currentRealmId) {
				router.push("/realms");
			}
		},
		onError: (err) => toast.error(err.message),
	});

	const transferMutation = useMutation({
		...trpc.realm.transferOwnership.mutationOptions(),
		onSuccess: () => {
			if (realmId) {
				leaveMutation.mutate(realmId);
			}
		},
		onError: (err) => toast.error(err.message),
	});

	const handleTransferAndLeave = async () => {
		if (!realmId || !selectedMemberId) return;
		await transferMutation.mutateAsync({
			realmId,
			newOwnerUserId: selectedMemberId,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Transfer Ownership & Leave</DialogTitle>
					<DialogDescription>
						You must transfer ownership of "{realmName || "this realm"}" before
						you can leave. Select a new owner.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					{isLoading ? (
						<div className="flex justify-center p-4">
							<Loader2 className="animate-spin" />
						</div>
					) : (
						<div className="max-h-[300px] overflow-y-auto pr-2">
							<div className="space-y-1">
								{members
									?.filter((m) => m.role !== "owner")
									.map((member) => (
										<button
											key={member.userId}
											className={cn(
												"flex w-full cursor-pointer items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent",
												selectedMemberId === member.userId && "bg-accent",
											)}
											onClick={() => setSelectedMemberId(member.userId)}
											type="button"
										>
											<Avatar className="h-8 w-8">
												<AvatarImage src={member.image || undefined} />
												<AvatarFallback>
													{member.name?.[0]?.toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 overflow-hidden">
												<div className="truncate font-medium">
													{member.name}
												</div>
												<div className="truncate text-muted-foreground text-xs">
													{member.email}
												</div>
											</div>
											{selectedMemberId === member.userId && (
												<Check className="h-4 w-4 text-primary" />
											)}
										</button>
									))}
								{members?.filter((m) => m.role !== "owner").length === 0 && (
									<div className="p-4 text-center text-muted-foreground text-sm">
										No other members to transfer ownership to.
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleTransferAndLeave}
						disabled={
							transferMutation.isPending ||
							leaveMutation.isPending ||
							!selectedMemberId
						}
					>
						{transferMutation.isPending || leaveMutation.isPending
							? "Processing..."
							: "Transfer & Leave"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
