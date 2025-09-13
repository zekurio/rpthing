"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CreateRealmDialog } from "@/components/create-realm-dialog";
import { JoinRealmDialog } from "@/components/join-realm-dialog";
import { NavigationLinks } from "@/components/navigation-links";
import { RealmSelector } from "@/components/realm-selector";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { UserInfo } from "@/components/user-info";
import { useAuth } from "@/hooks/use-auth";

export function UserMenu() {
	const router = useRouter();
	const { user, isLoading, signOut } = useAuth();

	// Dialog state
	const [isJoinOpen, setIsJoinOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);

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

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="flex h-auto items-center gap-3 py-2 pr-0 pl-3"
					>
						<UserInfo user={user} isLoading={isLoading} />
						<div className="flex flex-col items-start">
							<UserAvatar user={user} isLoading={isLoading} />
						</div>
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
							<UserInfo user={user} isLoading={isLoading} showEmail />
						</div>
					</DropdownMenuLabel>

					<DropdownMenuSeparator />

					{/* Navigation Links */}
					<div className="px-3 py-2">
						<NavigationLinks />

						<div className="mt-2" />

						<RealmSelector
							onJoinRealm={() => setIsJoinOpen(true)}
							onCreateRealm={() => setIsCreateOpen(true)}
						/>
						<DropdownMenuItem onClick={handleSignOut}>
							<LogOut className="mr-2 size-4" />
							Log out
						</DropdownMenuItem>
					</div>

					<DropdownMenuSeparator />

					{/* Theme Switcher */}
					<ThemeSwitcher />
				</DropdownMenuContent>
			</DropdownMenu>

			<JoinRealmDialog open={isJoinOpen} onOpenChange={setIsJoinOpen} />

			<CreateRealmDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
		</>
	);
}
