"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreateRealmButtonProps {
	onClick: () => void;
}

export function CreateRealmButton({ onClick }: CreateRealmButtonProps) {
	return (
		<div className="flex w-full items-center justify-center border-t bg-background py-3">
			<Button
				size="icon"
				variant="ghost"
				className="h-10 w-10 rounded-full"
				onClick={onClick}
			>
				<Plus className="h-4 w-4" />
			</Button>
		</div>
	);
}
