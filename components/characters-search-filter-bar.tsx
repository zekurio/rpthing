"use client";

import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CharactersSearchFilterBarProps {
	localSearch: string;
	onSearchChange: (value: string) => void;
	onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	activeFilterCount: number;
	onFilterClick: () => void;
}

export function CharactersSearchFilterBar({
	localSearch,
	onSearchChange,
	onSearchKeyDown,
	activeFilterCount,
	onFilterClick,
}: CharactersSearchFilterBarProps) {
	return (
		<div className="flex w-full items-center gap-2">
			<div className="relative flex flex-1 items-center">
				<Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
				<Input
					value={localSearch}
					onChange={(e) => onSearchChange(e.target.value)}
					onKeyDown={onSearchKeyDown}
					placeholder="Search characters..."
					className="h-10 w-full pr-3 pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
				/>
			</div>
			<Button
				variant="outline"
				size="icon"
				className="relative h-10 w-10 shrink-0"
				onClick={onFilterClick}
				aria-label="Open filters"
			>
				<Filter className="h-4 w-4 text-muted-foreground" />
				{activeFilterCount > 0 && (
					<span className="-right-1 -top-1 absolute flex h-5 w-5 items-center justify-center rounded-full bg-primary font-medium text-[11px] text-primary-foreground shadow-sm">
						{activeFilterCount}
					</span>
				)}
			</Button>
		</div>
	);
}
