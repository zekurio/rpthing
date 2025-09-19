"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { useAuth } from "@/hooks/use-auth";

function LoginPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAuthenticated, isLoading } = useAuth();
	const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
	const redirectUrl: string = searchParams.get("redirect") || "/realms";

	// Track when we've completed the initial auth check
	useEffect(() => {
		if (!isLoading && !hasInitiallyLoaded) {
			setHasInitiallyLoaded(true);
		}
	}, [isLoading, hasInitiallyLoaded]);

	useEffect(() => {
		if (hasInitiallyLoaded && isAuthenticated) {
			// Redirect to realms or intended destination if already authenticated
			if (redirectUrl === "/realms") {
				router.push("/realms");
			} else {
				try {
					const url = new URL(redirectUrl, window.location.origin);
					router.push(url.pathname + url.search + url.hash);
				} catch {
					router.push("/realms");
				}
			}
		}
	}, [isAuthenticated, hasInitiallyLoaded, router, redirectUrl]);

	// Show loading only during initial auth check, not during OAuth flow
	if (!hasInitiallyLoaded) {
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
