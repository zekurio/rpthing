"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { useAuth } from "@/hooks/use-auth";

function LoginPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAuthenticated, isLoading } = useAuth();
	const redirectUrl: string = searchParams.get("redirect") || "/realms";

	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			// Redirect to realms or intended destination if already authenticated
			if (redirectUrl === "/realms") {
				router.push("/realms");
			} else {
				router.push(redirectUrl as any);
			}
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

export default function LoginPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<LoginPageContent />
		</Suspense>
	);
}
