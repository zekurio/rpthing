interface UserInfoProps {
	user?: {
		name?: string;
		email?: string;
	} | null;
}

export function UserInfo({ user }: UserInfoProps) {
	return (
		<div className="flex flex-col gap-1">
			<span className="font-medium text-md">{user?.name || "User"}</span>
			<span className="font-light text-muted-foreground text-sm">
				{user?.email || ""}
			</span>
		</div>
	);
}
