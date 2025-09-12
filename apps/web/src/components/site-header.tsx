"use client";

import type { User } from "better-auth";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { authClient } from "@/lib/auth-client";

export function SiteHeader() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const user = session?.user as User | undefined;

	const handleSignIn = () => {
		router.push("/login");
	};

	return (
		<header className="relative z-20">
			<div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
				<Logo />
				<div className="flex items-center gap-4">
					{isPending ? (
						<div className="h-8 w-8 animate-pulse rounded-full bg-accent" />
					) : user ? (
						<UserMenu />
					) : (
						<Button onClick={handleSignIn}>Sign In</Button>
					)}
				</div>
			</div>
		</header>
	);
}
