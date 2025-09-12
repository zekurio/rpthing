"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
	Crown,
	Home,
	LogOut,
	Monitor,
	Moon,
	Plus,
	Settings,
	Sun,
	UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { type FormEvent, useId, useState } from "react";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, trpc } from "@/utils/trpc";

export function UserMenu() {
	const router = useRouter();
	const { user, isLoading, signOut } = useAuth();
	const { theme, setTheme } = useTheme();

	const realms = useQuery(trpc.realm.list.queryOptions());

	const joinMutation = useMutation({
		...trpc.realm.join.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries();
			toast.success("Joined realm.");
		},
		onError: (err) => toast.error(err.message),
	});

	const createMutation = useMutation({
		...trpc.realm.create.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries();
			toast.success("Realm created.");
		},
		onError: (err) => toast.error(err.message),
	});

	// Join dialog state
	const [isJoinOpen, setIsJoinOpen] = useState(false);
	const [joinRealmId, setJoinRealmId] = useState("");
	const [joinPassword, setJoinPassword] = useState("");
	const joinRealmIdInputId = useId();
	const joinPasswordInputId = useId();

	// Create dialog state
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [createId, setCreateId] = useState("");
	const [createName, setCreateName] = useState("");
	const [createDescription, setCreateDescription] = useState("");
	const [createPassword, setCreatePassword] = useState("");
	const createIdInputId = useId();
	const createNameInputId = useId();
	const createDescriptionInputId = useId();
	const createPasswordInputId = useId();

	const handleSelectRealm = (realmId: string) => {
		try {
			localStorage.setItem("activeRealmId", realmId);
			toast.success("Active realm updated.");
		} catch {
			toast.error("Failed to set active realm.");
		}
	};

	const submitJoin = async (e: FormEvent) => {
		e.preventDefault();
		if (!joinRealmId) return;
		try {
			await joinMutation.mutateAsync({
				realmId: joinRealmId,
				password: joinPassword || undefined,
			});
			setIsJoinOpen(false);
			setJoinRealmId("");
			setJoinPassword("");
		} catch {}
	};

	const submitCreate = async (e: FormEvent) => {
		e.preventDefault();
		if (!createId || !createName) return;
		try {
			await createMutation.mutateAsync({
				id: createId,
				name: createName,
				description: createDescription || undefined,
				password: createPassword || undefined,
			});
			setIsCreateOpen(false);
			setCreateId("");
			setCreateName("");
			setCreateDescription("");
			setCreatePassword("");
		} catch {}
	};

	const handleSignOut = async () => {
		try {
			await signOut();
			toast.success("You have been signed out successfully.");
			router.push("/login");
		} catch (error) {
			console.error("Failed to sign out:", error);
			toast.error("Failed to sign out. Please try again.");
		}
	};

	const renderUserInfo = () => {
		if (isLoading) {
			return <div className="h-5 w-24 animate-pulse rounded-md bg-accent" />;
		}

		return <span className="truncate font-medium">{user?.name || "User"}</span>;
	};

	const renderUserInfoWithEmail = () => {
		if (isLoading) {
			return (
				<div className="flex flex-col gap-1">
					<div className="h-4 w-24 animate-pulse rounded-md bg-accent" />
					<div className="h-3 w-32 animate-pulse rounded-md bg-accent" />
				</div>
			);
		}

		return (
			<div className="flex flex-col gap-1">
				<span className="truncate font-medium">{user?.name || "User"}</span>
				<span className="truncate text-muted-foreground text-sm">
					{user?.email || ""}
				</span>
			</div>
		);
	};

	const renderAvatar = () => {
		if (isLoading) {
			return <div className="h-8 w-8 animate-pulse rounded-full bg-accent" />;
		}

		return (
			<Avatar className="h-8 w-8">
				<AvatarImage src={user?.image || ""} alt={user?.name || ""} />
				<AvatarFallback className="rounded-lg">
					{user?.name ? user.name.charAt(0).toUpperCase() : "U"}
				</AvatarFallback>
			</Avatar>
		);
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="flex h-auto items-center gap-3 py-2 pr-0 pl-3"
					>
						{renderUserInfo()}
						<div className="flex flex-col items-start">{renderAvatar()}</div>
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent
					className="min-w-56 rounded-lg"
					align="end"
					sideOffset={4}
				>
					{/* User Information */}
					<DropdownMenuLabel className="p-0 font-normal">
						<div className="px-3 py-2 text-left">
							{renderUserInfoWithEmail()}
						</div>
					</DropdownMenuLabel>

					<DropdownMenuSeparator />

					{/* Navigation Links */}
					<div className="px-3 py-2">
						<div className="mb-2 font-medium text-muted-foreground text-xs">
							Quick Links
						</div>
						<DropdownMenuGroup>
							<DropdownMenuItem onClick={() => router.push("/")}>
								<Home className="mr-2 size-4" />
								Home
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => router.push("/settings")}>
								<Settings className="mr-2 size-4" />
								Settings
							</DropdownMenuItem>
						</DropdownMenuGroup>

						<div className="mt-2" />

						<div className="mb-2 font-medium text-muted-foreground text-xs">
							Realms
						</div>
						<DropdownMenuGroup>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>Select world</DropdownMenuSubTrigger>
								<DropdownMenuSubContent>
									{realms.isLoading && (
										<DropdownMenuItem>Loading...</DropdownMenuItem>
									)}
									{realms.data?.length === 0 && (
										<DropdownMenuItem>No realms</DropdownMenuItem>
									)}
									{realms.data?.map((r) => (
										<DropdownMenuItem
											key={r.id}
											onClick={() => handleSelectRealm(r.id)}
										>
											{r.role === "owner" && <Crown className="mr-2 size-4" />}
											<span className="truncate">{r.name ?? r.id}</span>
										</DropdownMenuItem>
									))}
								</DropdownMenuSubContent>
							</DropdownMenuSub>
							<DropdownMenuItem onClick={() => setIsJoinOpen(true)}>
								<UserPlus className="mr-2 size-4" />
								Join realm
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setIsCreateOpen(true)}>
								<Plus className="mr-2 size-4" />
								Create realm
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuItem onClick={handleSignOut}>
							<LogOut className="mr-2 size-4" />
							Log out
						</DropdownMenuItem>
					</div>

					<DropdownMenuSeparator />

					{/* Theme Switcher */}
					<div className="px-3 py-2">
						<div className="mb-2 font-medium text-muted-foreground text-xs">
							Theme
						</div>
						<Tabs value={theme} onValueChange={setTheme} className="w-full">
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="light" className="flex items-center gap-1">
									<Sun className="h-3 w-3" />
									Light
								</TabsTrigger>
								<TabsTrigger value="dark" className="flex items-center gap-1">
									<Moon className="h-3 w-3" />
									Dark
								</TabsTrigger>
								<TabsTrigger value="system" className="flex items-center gap-1">
									<Monitor className="h-3 w-3" />
									System
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Join realm</DialogTitle>
						<DialogDescription>
							Enter the realm ID and password if required.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={submitJoin} className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor={joinRealmIdInputId}>Realm ID</Label>
							<Input
								id={joinRealmIdInputId}
								value={joinRealmId}
								onChange={(e) => setJoinRealmId(e.target.value)}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={joinPasswordInputId}>Password (optional)</Label>
							<Input
								id={joinPasswordInputId}
								type="password"
								value={joinPassword}
								onChange={(e) => setJoinPassword(e.target.value)}
							/>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								type="button"
								onClick={() => setIsJoinOpen(false)}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!joinRealmId || joinMutation.isPending}
							>
								{joinMutation.isPending ? "Joining..." : "Join"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create realm</DialogTitle>
						<DialogDescription>
							Fill in the details to create a new realm.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={submitCreate} className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor={createIdInputId}>ID</Label>
							<Input
								id={createIdInputId}
								value={createId}
								onChange={(e) => setCreateId(e.target.value)}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={createNameInputId}>Name</Label>
							<Input
								id={createNameInputId}
								value={createName}
								onChange={(e) => setCreateName(e.target.value)}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={createDescriptionInputId}>
								Description (optional)
							</Label>
							<Input
								id={createDescriptionInputId}
								value={createDescription}
								onChange={(e) => setCreateDescription(e.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={createPasswordInputId}>Password (optional)</Label>
							<Input
								id={createPasswordInputId}
								type="password"
								value={createPassword}
								onChange={(e) => setCreatePassword(e.target.value)}
							/>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								type="button"
								onClick={() => setIsCreateOpen(false)}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!createId || !createName || createMutation.isPending}
							>
								{createMutation.isPending ? "Creating..." : "Create"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
