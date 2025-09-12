"use client";

import { Home, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="flex h-auto items-center gap-3 px-3 py-2"
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
					<div className="px-3 py-2 text-left">{renderUserInfoWithEmail()}</div>
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
	);
}
