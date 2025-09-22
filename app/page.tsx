"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
	const router = useRouter();
	const { isAuthenticated, isLoading } = useAuth();

	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			router.replace("/realms");
		}
	}, [isAuthenticated, isLoading, router]);

	return (
		<main className="relative">
			{/* Decorative background */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-[-12rem] z-[-1] mx-auto h-[28rem] w-[56rem] max-w-[95%] rounded-[999px] bg-gradient-to-b from-primary/25 to-transparent opacity-60 blur-3xl dark:from-primary/20"
			/>

			{/* Hero */}
			<section className="container mx-auto px-4">
				<div className="mx-auto grid max-w-5xl items-center gap-8 pt-12 pb-8 text-center md:gap-10 md:pt-20 md:pb-12">
					<div className="flex justify-center">
						<Logo />
					</div>
					<h1 className="text-balance font-bold text-4xl leading-tight tracking-tight md:text-6xl">
						Run your tabletop campaigns, together.
					</h1>
					<p className="mx-auto max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
						Organize realms, manage members, and keep every session in sync with
						a fast, clean UI.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-3">
						<Button asChild size="lg">
							<Link href="/login">
								Get started
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button asChild variant="outline" size="lg">
							<Link href="/realms">Go to Realms</Link>
						</Button>
					</div>
				</div>
			</section>
		</main>
	);
}
