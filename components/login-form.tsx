"use client";

import { useSearchParams } from "next/navigation";
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
	const searchParams = useSearchParams();

	const getRedirectUrl = () => {
		const redirect = searchParams?.get("redirect") ?? null;

		if (redirect) {
			return redirect;
		}

		return "/realms";
	};

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
			<Card className="bg-card">
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Welcome back</CardTitle>
					<CardDescription>Login with your Discord account</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-6">
						<div className="flex flex-col gap-4">
							<Button
								variant="outline"
								className="h-12 w-full font-medium text-base"
								type="button"
								onClick={() => handleSignIn("discord", getRedirectUrl())}
								disabled={loading}
							>
								<BsDiscord className="mr-2 h-5 w-5" />
								Login with Discord
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
