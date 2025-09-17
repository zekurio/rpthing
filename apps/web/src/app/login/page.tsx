"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAuthenticated, isLoading } = useAuth();
	const redirectUrl = searchParams.get("redirect") || "/realms";

	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			// Redirect to realms or intended destination if already authenticated
			router.push(redirectUrl);
		}
	}, [isAuthenticated, isLoading, router, redirectUrl]);

	// Show loading while checking authentication status
	if (isLoading) {
		return (
			<div className="bg flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
				<div className="flex w-full max-w-sm flex-col gap-6">
					<Logo />
					<div className="text-center">Loading...</div>
				</div>
			</div>
		);
	}

	// Don't render login form if user is authenticated (will redirect)
	if (isAuthenticated) {
		return null;
	}

	return (
		<div className="bg flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<Logo />
				<Suspense fallback={<div>Loading...</div>}>
					<LoginForm />
				</Suspense>
			</div>
		</div>
	);
}
