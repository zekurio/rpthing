"use client";

import { LoadingText } from "@/components/ui/loading";

export function CharactersLoadingState() {
	return (
		<div className="flex h-full flex-col items-center justify-center text-center">
			<LoadingText text="Loading..." size="lg" />
		</div>
	);
}
