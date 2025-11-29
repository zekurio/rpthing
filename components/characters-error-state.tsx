"use client";

import { Button } from "@/components/ui/button";

export function CharactersErrorState() {
	return (
		<div className="flex h-full flex-col items-center justify-center text-center">
			<div className="mb-4 text-6xl">❌</div>
			<h1 className="font-bold text-2xl">Something went wrong</h1>
			<p className="mt-2 max-w-md text-muted-foreground">
				Unable to load characters. Please try again.
			</p>
			<div className="mt-6">
				<Button onClick={() => window.location.reload()}>Retry</Button>
			</div>
		</div>
	);
}
