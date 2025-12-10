"use client";

import { LogOut, Monitor, Moon, MoreVertical, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

export function UserMenu() {
	const router = useRouter();
	const { user, isLoading, signOut } = useAuth();
	const { theme, setTheme } = useTheme();

	const handleSignOut = async () => {
		try {
			await signOut();
			toast.success("You have been signed out successfully.");
			router.push("/");
		} catch (error) {
			console.error("Failed to sign out:", error);
			toast.error("Sign out failed");
		}
	};

	if (!user) {
		return null;
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<div className="flex w-full cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent">
							{isLoading ? (
								<>
									<div className="h-8 w-8 flex-shrink-0 rounded-lg bg-accent grayscale" />
									<div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
										<span className="h-4 w-24 rounded bg-accent" />
										<span className="mt-1 h-3 w-32 rounded bg-accent" />
									</div>
									<MoreVertical className="ml-auto size-4 flex-shrink-0" />
								</>
							) : (
								<>
									<Avatar className="h-8 w-8 flex-shrink-0 rounded-lg">
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
									<MoreVertical className="ml-auto size-4 flex-shrink-0" />
								</>
							)}
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="box-border w-(--radix-dropdown-menu-trigger-width) min-w-0"
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
						<DropdownMenuLabel className="p-0">
							<div className="px-1 py-2">
								<Tabs value={theme} onValueChange={setTheme} className="w-full">
									<TabsList className="grid w-full grid-cols-3">
										<TabsTrigger value="light">
											<Sun className="h-4 w-4" />
										</TabsTrigger>
										<TabsTrigger value="dark">
											<Moon className="h-4 w-4" />
										</TabsTrigger>
										<TabsTrigger value="system">
											<Monitor className="h-4 w-4" />
										</TabsTrigger>
									</TabsList>
								</Tabs>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onSelect={(event) => {
								event.preventDefault();
								handleSignOut();
							}}
						>
							<div className="flex items-center gap-2">
								<LogOut className="size-4 shrink-0" />
								<span>Log out</span>
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
