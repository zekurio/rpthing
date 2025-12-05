"use client";

import { Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CharactersFloatingMenuProps {
	localSearch: string;
	onSearchChange: (value: string) => void;
	onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	activeFilterCount: number;
	onFilterClick: () => void;
	onCreateClick: () => void;
}

export function CharactersFloatingMenu({
	localSearch,
	onSearchChange,
	onSearchKeyDown,
	activeFilterCount,
	onFilterClick,
	onCreateClick,
}: CharactersFloatingMenuProps) {
	return (
		<div className="-translate-x-1/2 fixed bottom-6 left-1/2 z-50 flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="relative flex items-center">
				<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
				<Input
					value={localSearch}
					onChange={(e) => onSearchChange(e.target.value)}
					onKeyDown={onSearchKeyDown}
					placeholder="Search..."
					className="h-9 w-48 rounded-full pl-9 sm:w-64 md:w-80 lg:w-96"
				/>
			</div>
			<Button
				variant="outline"
				size="icon"
				className="relative h-9 w-9 shrink-0 rounded-full"
				onClick={onFilterClick}
				aria-label="Open filters"
			>
				<Filter className="h-4 w-4" />
				{activeFilterCount > 0 && (
					<span className="-right-1 -top-1 absolute flex h-5 w-5 items-center justify-center rounded-full bg-primary font-medium text-[11px] text-primary-foreground">
						{activeFilterCount}
					</span>
				)}
			</Button>
			<Button
				size="icon"
				className="h-9 w-9 shrink-0 rounded-full"
				onClick={onCreateClick}
				aria-label="Create character"
			>
				<Plus className="h-4 w-4" />
			</Button>
		</div>
	);
}
