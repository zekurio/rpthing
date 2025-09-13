"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient, trpc } from "@/utils/trpc";

const joinRealmSchema = z.object({
	realmId: z.string().min(1, "Realm ID is required"),
	password: z.string().optional(),
});

type JoinRealmFormData = z.infer<typeof joinRealmSchema>;

interface JoinRealmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function JoinRealmDialog({ open, onOpenChange }: JoinRealmDialogProps) {
	const joinRealmIdInputId = useId();
	const joinPasswordInputId = useId();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<JoinRealmFormData>({
		resolver: zodResolver(joinRealmSchema),
		defaultValues: {
			realmId: "",
			password: "",
		},
	});

	const joinMutation = useMutation({
		...trpc.realm.join.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries();
			toast.success("Joined realm.");
			handleClose();
		},
		onError: (err) => toast.error(err.message),
	});

	const onSubmit = async (data: JoinRealmFormData) => {
		try {
			await joinMutation.mutateAsync({
				realmId: data.realmId,
				password: data.password || undefined,
			});
		} catch {}
	};

	const handleClose = () => {
		reset();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Join realm</DialogTitle>
					<DialogDescription>
						Enter the realm ID and password if required.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor={joinRealmIdInputId}>Realm ID</Label>
						<Input
							id={joinRealmIdInputId}
							{...register("realmId")}
							className={errors.realmId ? "border-red-500" : ""}
						/>
						{errors.realmId && (
							<p className="text-red-500 text-sm">{errors.realmId.message}</p>
						)}
					</div>
					<div className="grid gap-2">
						<Label htmlFor={joinPasswordInputId}>Password (optional)</Label>
						<Input
							id={joinPasswordInputId}
							type="password"
							{...register("password")}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" type="button" onClick={handleClose}>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting || joinMutation.isPending}
						>
							{joinMutation.isPending ? "Joining..." : "Join"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
