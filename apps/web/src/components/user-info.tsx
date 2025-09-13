"use client";

interface UserInfoProps {
	user?: {
		name?: string;
		email?: string;
		image?: string | null;
	} | null;
	isLoading?: boolean;
	showEmail?: boolean;
}

export function UserInfo({
	user,
	isLoading,
	showEmail = false,
}: UserInfoProps) {
	if (isLoading) {
		if (showEmail) {
			return (
				<div className="flex flex-col gap-1">
					<div className="h-4 w-24 animate-pulse rounded-md bg-accent" />
					<div className="h-3 w-32 animate-pulse rounded-md bg-accent" />
				</div>
			);
		}
		return <div className="h-5 w-24 animate-pulse rounded-md bg-accent" />;
	}

	if (showEmail) {
		return (
			<div className="flex flex-col gap-1">
				<span className="truncate font-semibold text-lg">
					{user?.name || "User"}
				</span>
				<span className="truncate text-muted-foreground text-sm">
					{user?.email || ""}
				</span>
			</div>
		);
	}

	return (
		<span className="truncate font-semibold text-lg">
			{user?.name || "User"}
		</span>
	);
}
