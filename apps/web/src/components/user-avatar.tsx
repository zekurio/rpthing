"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
	user?: {
		name?: string;
		image?: string | null;
	} | null;
	isLoading?: boolean;
	className?: string;
}

export function UserAvatar({ user, isLoading, className }: UserAvatarProps) {
	if (isLoading) {
		return (
			<div
				className={`h-10 w-10 animate-pulse rounded-full bg-accent ${className || ""}`}
			/>
		);
	}

	return (
		<Avatar className={`h-10 w-10 ${className || ""}`}>
			<AvatarImage src={user?.image ?? undefined} alt={user?.name || ""} />
			<AvatarFallback className="rounded-lg">
				{user?.name ? user.name.charAt(0).toUpperCase() : "U"}
			</AvatarFallback>
		</Avatar>
	);
}
