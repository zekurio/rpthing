"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { User } from "better-auth";
import { Edit, Plus, Trash, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CreateOrJoinRealmDialog } from "@/components/create-or-join-realm-dialog";
import { EditRealmDialog } from "@/components/edit-realm-dialog";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogOverlay } from "@/components/ui/dialog";
import { UserMenu } from "@/components/user-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";

export function SiteHeader() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const user = session?.user as User | undefined;
	const isMobile = useIsMobile();
	const [realmsOpen, setRealmsOpen] = useState(false);

	const showMobileRealms = isMobile && !!user;

	const handleSignIn = () => {
		router.push("/login");
	};

	return (
		<header className="relative z-20 w-full border-b">
			<div className="flex h-16 items-center justify-between pr-3 pl-3">
				<div className="flex items-center gap-2">
					<Logo />
				</div>
				<div className="flex items-center gap-4">
					{isPending ? (
						<div className="h-8 w-8 animate-pulse rounded-full bg-accent" />
					) : user ? (
						<UserMenu />
					) : (
						<Button onClick={handleSignIn}>Sign In</Button>
					)}
				</div>
			</div>
			{showMobileRealms ? (
				<MobileRealmsSheet open={realmsOpen} onOpenChange={setRealmsOpen} />
			) : null}
			{showMobileRealms ? (
				<EdgeSwipeActivator
					enabled={!realmsOpen}
					onOpen={() => setRealmsOpen(true)}
				/>
			) : null}
		</header>
	);
}

function MobileRealmsSheet({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const params = useParams();
	const [createOpen, setCreateOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const draggingRef = useRef(false);
	const startXRef = useRef(0);
	const startYRef = useRef(0);

	const { data, isPending, error } = useQuery({
		...trpc.realm.list.queryOptions(),
		retry: 2, // Retry failed requests up to 2 times
		retryDelay: 1000, // Wait 1 second between retries
	});
	// If there's an error, treat it as if there are no realms (show empty state)
	// This provides a better UX than showing an error when the user has no realms
	const realms = error ? [] : (data ?? []);
	// Server now returns full S3 URLs; no need to prefix with server URL

	// Get current realm ID from URL params
	const currentRealmId = params.realmId as string | undefined;

	const deleteMutation = useMutation({
		...trpc.realm.delete.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trpc.realm.list.queryKey() });
			toast.success("Realm deleted.");
		},
		onError: (err) => toast.error(err.message),
	});

	const handleNavigate = (realmId: string) => {
		router.push(`/realms/${realmId}`);
		onOpenChange(false);
	};

	const handleEdit = (_realmId: string) => {
		setEditOpen(true);
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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogOverlay />
			<DialogPrimitive.Content
				className="data-[state=closed]:-translate-x-full fixed inset-y-0 left-0 z-50 h-full w-64 border-r bg-background shadow-lg outline-hidden transition-transform duration-200 data-[state=open]:translate-x-0 sm:w-72"
				onPointerDown={(e) => {
					draggingRef.current = true;
					startXRef.current = e.clientX;
					startYRef.current = e.clientY;
					(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
				}}
				onPointerMove={(e) => {
					if (!draggingRef.current) return;
					const dx = e.clientX - startXRef.current;
					const dy = e.clientY - startYRef.current;
					if (dx < -40 && Math.abs(dy) < 30) {
						draggingRef.current = false;
						onOpenChange(false);
					}
				}}
				onPointerUp={() => {
					draggingRef.current = false;
				}}
			>
				<DialogPrimitive.Title className="sr-only">
					Realms
				</DialogPrimitive.Title>
				<div className="flex items-center justify-between border-b p-3">
					<span className="font-semibold">Realms</span>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setCreateOpen(true)}
							aria-label="Create realm"
						>
							<Plus className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => onOpenChange(false)}
							aria-label="Close"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</div>
				<div className="flex h-[calc(100%-3.25rem)] flex-col gap-2 overflow-y-auto p-3">
					{isPending ? (
						<div className="grid gap-2">
							<div className="h-12 animate-pulse rounded-md bg-accent" />
							<div className="h-12 animate-pulse rounded-md bg-accent" />
						</div>
					) : realms.length === 0 ? (
						<div className="text-muted-foreground text-sm">No realms yet.</div>
					) : (
						realms.map((r) => {
							const src = r.iconKey || undefined;
							const isSelected = r.id === currentRealmId;
							return (
								<div
									key={r.id}
									className={`flex items-center justify-between gap-3 rounded-md border p-2 ${
										isSelected ? "ring-2 ring-primary" : ""
									}`}
								>
									<button
										type="button"
										onClick={() => handleNavigate(r.id)}
										className="flex flex-1 items-center gap-3 text-left"
									>
										<Avatar className="h-8 w-8">
											<AvatarImage src={src} alt={r.name} />
											<AvatarFallback className="rounded-full">
												{r.name?.[0]?.toUpperCase() || "R"}
											</AvatarFallback>
										</Avatar>
										<span className="overflow-hidden text-ellipsis whitespace-nowrap font-medium text-sm">
											{r.name}
										</span>
									</button>
									<div className="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleEdit(r.id)}
											aria-label={`Edit ${r.name}`}
										>
											<Edit className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDelete(r.id)}
											className="text-destructive hover:text-destructive"
											aria-label={`Delete ${r.name}`}
										>
											<Trash className="h-4 w-4" />
										</Button>
									</div>
								</div>
							);
						})
					)}
				</div>
				<CreateOrJoinRealmDialog
					open={createOpen}
					onOpenChange={setCreateOpen}
				/>
				<EditRealmDialog open={editOpen} onOpenChange={setEditOpen} />
			</DialogPrimitive.Content>
		</Dialog>
	);
}

function EdgeSwipeActivator({
	enabled,
	onOpen,
}: {
	enabled: boolean;
	onOpen: () => void;
}) {
	const trackingRef = useRef(false);
	const startXRef = useRef(0);
	const startYRef = useRef(0);

	if (!enabled) return null;

	return (
		<div
			aria-hidden
			className="fixed inset-y-0 left-0 z-40 w-2 touch-pan-y sm:hidden"
			onPointerDown={(e) => {
				trackingRef.current = true;
				startXRef.current = e.clientX;
				startYRef.current = e.clientY;
				(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
			}}
			onPointerMove={(e) => {
				if (!trackingRef.current) return;
				const dx = e.clientX - startXRef.current;
				const dy = e.clientY - startYRef.current;
				if (dx > 30 && Math.abs(dy) < 30) {
					trackingRef.current = false;
					onOpen();
				}
			}}
			onPointerUp={() => {
				trackingRef.current = false;
			}}
		/>
	);
}
