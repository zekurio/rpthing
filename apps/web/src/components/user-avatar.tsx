"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
	user?: {
		name?: string;
		image?: string | null;
	} | null;
	isLoading?: boolean;
}

export function UserAvatar({ user, isLoading }: UserAvatarProps) {
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
}
