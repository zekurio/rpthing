"use client";

import { useState } from "react";
import { BsDiscord } from "react-icons/bs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function LoginForm({
	className,
	...props
}: React.ComponentPropsWithoutRef<"div">) {
	const [loading, setLoading] = useState(false);
	const { signInWithProvider } = useAuth();

	async function handleSignIn(provider: "discord", callbackURL: string) {
		try {
			setLoading(true);
			await signInWithProvider(provider, callbackURL);
		} catch (err) {
			toast.error(`Failed to login with ${provider}`, {
				description: err instanceof Error ? err.message : "Please try again.",
			});
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className={cn("flex flex-col gap-2", className)} {...props}>
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Welcome back</CardTitle>
					<CardDescription>Login with your Discord account</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-6">
						<div className="flex flex-col gap-4">
							<Button
								variant="outline"
								className="w-full"
								type="button"
								onClick={() =>
									handleSignIn(
										"discord",
										`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
									)
								}
								disabled={loading}
							>
								<BsDiscord />
								Login with Discord
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
