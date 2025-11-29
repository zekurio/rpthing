"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function CharactersSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{Array.from({ length: 10 }, (_, i) => `skeleton-${i}`).map((key) => (
				<Skeleton key={key} className="aspect-[3/4] w-full rounded-lg" />
			))}
		</div>
	);
}
