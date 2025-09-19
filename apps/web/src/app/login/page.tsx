"use client";

import { Dices } from "lucide-react";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<div className="flex items-center justify-center gap-3">
					<div className="flex aspect-square size-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
						<Dices className="size-4" />
					</div>
					<span className="font-bold text-2xl">rpthing</span>
				</div>
				<Suspense>
					<LoginForm />
				</Suspense>
			</div>
		</div>
	);
}
