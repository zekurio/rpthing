"use client";

import { Home, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

import {
	DropdownMenuGroup,
	DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function NavigationLinks() {
	const router = useRouter();

	return (
		<>
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
		</>
	);
}
