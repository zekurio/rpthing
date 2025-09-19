"use client";

import { Home, Link, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThemeSwitcher } from "@/components/theme-switcher";
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
import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";

export function UserMenu() {
	const router = useRouter();
	const { user, isLoading } = useAuth();

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
		<div className="flex items-center">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					{isLoading ? (
						<div className="h-10 w-10 rounded-full bg-accent" />
					) : (
						<Avatar className="h-10 w-10 cursor-pointer rounded-full">
							<AvatarImage src={user?.image || ""} alt={user?.name || ""} />
							<AvatarFallback className="rounded-lg">
								{user?.name ? user.name.charAt(0) : "U"}
							</AvatarFallback>
						</Avatar>
					)}
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="min-w-56 rounded-lg"
					align="end"
					sideOffset={4}
				>
					<DropdownMenuLabel className="p-0 font-normal">
						<div className="flex flex-col gap-1 px-3 py-2 text-left">
							{isLoading ? (
								<>
									<div className="h-5 w-24 rounded-md bg-accent" />
									<div className="mt-1 h-3 w-32 rounded-md bg-accent" />
								</>
							) : (
								<>
									<span className="truncate font-medium">
										{user?.name || "User"}
									</span>
									<span className="truncate text-muted-foreground text-xs">
										{user?.email || ""}
									</span>
								</>
							)}
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={() => router.push("/")}>
							<Home className="mr-2 size-4" />
							Home
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => router.push("/realms")}>
							<Link className="mr-2 size-4" />
							Realms
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => router.push("/settings")}>
							<Settings className="mr-2 size-4" />
							Settings
						</DropdownMenuItem>
						<DropdownMenuItem onClick={handleSignOut}>
							<LogOut className="mr-2 size-4" />
							Log out
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<div className="px-3 py-2">
						<ThemeSwitcher />
					</div>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
