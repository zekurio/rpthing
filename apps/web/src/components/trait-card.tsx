"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Trait } from "@/types";

interface TraitCardProps {
	trait: Trait;
	onEdit: (trait: Trait) => void;
	onDelete: (id: string) => void;
}

export function TraitCard({ trait, onEdit, onDelete }: TraitCardProps) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-md border p-3">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate font-medium">{trait.name}</span>
					<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs uppercase">
						{trait.displayMode}
					</span>
				</div>
				{trait.description && (
					<p className="mt-1 truncate text-muted-foreground text-sm">
						{trait.description}
					</p>
				)}
			</div>
			<div className="flex shrink-0 items-center gap-1">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onEdit(trait)}
					aria-label="Edit trait"
				>
					<Pencil className="h-3 w-3" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="text-destructive"
					onClick={() => onDelete(trait.id)}
					aria-label="Delete trait"
				>
					<Trash2 className="h-3 w-3" />
				</Button>
			</div>
		</div>
	);
}
