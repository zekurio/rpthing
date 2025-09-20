"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { LoadingText } from "@/components/ui/loading";

export default function LoginPage() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<div className="flex justify-center">
					<Logo />
				</div>
				<Suspense fallback={<LoadingText text="Loading..." />}>
					<LoginForm />
				</Suspense>
			</div>
		</div>
	);
}
