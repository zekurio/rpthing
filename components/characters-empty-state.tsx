"use client";

import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CharactersEmptyStateProps {
	type: "no-realms" | "no-characters" | "no-results";
	hasActiveFilters?: boolean;
	onCreateRealm?: () => void;
	onClearFilters?: () => void;
}

export function CharactersEmptyState({
	type,
	hasActiveFilters = false,
	onCreateRealm,
	onClearFilters,
}: CharactersEmptyStateProps) {
	if (type === "no-realms") {
		return (
			<div className="flex h-full flex-col items-center justify-center text-center">
				<div className="mb-4 text-6xl">🧹</div>
				<h1 className="font-bold text-2xl">It's quite empty in here.</h1>
				<p className="mt-2 max-w-md text-muted-foreground">
					No realms yet... maybe you should create one?
				</p>
				{onCreateRealm && (
					<div className="mt-6">
						<Button onClick={onCreateRealm}>Create or join a realm</Button>
					</div>
				)}
			</div>
		);
	}

	if (type === "no-characters" || type === "no-results") {
		return (
			<div className="flex min-h-[12rem] flex-col items-center justify-center border-2 border-muted-foreground/25 border-dashed p-8 text-center">
				<div className="mb-4 bg-muted p-3">
					<Users className="h-6 w-6 text-muted-foreground" />
				</div>
				<h4 className="mb-1 font-semibold text-sm">
					{hasActiveFilters ? "No matching characters" : "No characters yet"}
				</h4>
				<p className="mb-4 max-w-sm text-muted-foreground text-xs">
					{hasActiveFilters
						? "Try adjusting your filters."
						: "Create characters in one of your realms to get started."}
				</p>
				{hasActiveFilters && onClearFilters && (
					<Button variant="outline" size="sm" onClick={onClearFilters}>
						Clear filters
					</Button>
				)}
			</div>
		);
	}

	return null;
}
