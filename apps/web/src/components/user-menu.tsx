"use client";

import { LogOut, MoreVertical, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { SettingsDialog } from "./settings-dialog";

export function UserMenu() {
	const router = useRouter();
	const { user, isLoading } = useAuth();
	const [settingsOpen, setSettingsOpen] = useState(false);

	const handleSignOut = async () => {
		try {
			await authClient.signOut();
			toast.success("You have been signed out successfully.");
			router.push("/");
		} catch (error) {
			console.error("Failed to sign out:", error);
		}
	};

	if (!user) {
		return <Button onClick={() => router.push("/login")}>Sign In</Button>;
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							{isLoading ? (
								<>
									<div className="h-8 w-8 rounded-lg bg-accent grayscale" />
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="h-4 w-24 rounded bg-accent" />
										<span className="mt-1 h-3 w-32 rounded bg-accent" />
									</div>
									<MoreVertical className="ml-auto size-4 text-muted-foreground" />
								</>
							) : (
								<>
									<Avatar className="h-8 w-8 rounded-lg">
										<AvatarImage
											src={user?.image || ""}
											alt={user?.name || ""}
										/>
										<AvatarFallback className="rounded-lg">
											{user?.name ? user.name.charAt(0) : "U"}
										</AvatarFallback>
									</Avatar>
									<div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">
											{user?.name || "User"}
										</span>
									</div>
									<MoreVertical className="ml-auto size-4" />
								</>
							)}
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="box-border w-(--radix-dropdown-menu-trigger-width) min-w-0 rounded-lg"
						side="top"
						align="end"
						sideOffset={6}
						collisionPadding={8}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
									<span className="truncate text-muted-foreground text-xs">
										{user?.email || ""}
									</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem onClick={() => setSettingsOpen(true)}>
								<Settings />
								Settings
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleSignOut}>
							<LogOut />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
			<SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
		</SidebarMenu>
	);
}
