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
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function LoginForm({
	className,
	...props
}: React.ComponentPropsWithoutRef<"div">) {
	const [loading, setLoading] = useState(false);

	async function handleSignIn(provider: "discord", callbackURL: string) {
		await authClient.signIn.social(
			{
				provider,
				callbackURL,
			},
			{
				onRequest: () => {
					setLoading(true);
				},
				onError: (ctx: { error: { message: string } }) => {
					toast.error(`Failed to login with ${provider}`, {
						description: ctx.error.message,
					});
				},
			},
		);
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
								onClick={() => handleSignIn("discord", `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)}
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
