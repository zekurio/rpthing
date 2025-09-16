"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { CreateTraitDialog } from "@/components/create-trait-dialog";
import { DeleteTraitButton } from "@/components/delete-trait-button";
import { EditTraitDialog } from "@/components/edit-trait-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, trpc } from "@/utils/trpc";

interface TraitsManagerProps {
	realmId: string;
}

export function TraitsManager({ realmId }: TraitsManagerProps) {
	const { data: traits, isLoading } = useQuery({
		...trpc.trait.list.queryOptions({ realmId }),
	});

	const [createOpen, setCreateOpen] = useState(false);

	const invalidateList = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: trpc.trait.list.queryKey({ realmId }),
		});
	}, [realmId]);

	return (
		<div className="grid gap-4">
			<div className="flex items-center justify-between">
				<h3 className="font-semibold text-lg">Traits</h3>
				<Button size="sm" onClick={() => setCreateOpen(true)}>
					<Plus className="mr-1 h-3 w-3" /> New
				</Button>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			) : traits && traits.length > 0 ? (
				<div className="space-y-2">
					{traits.map((t) => (
						<div
							key={t.id}
							className="flex items-center justify-between gap-3 rounded-md border p-3"
						>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className="truncate font-medium">{t.name}</span>
									<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs uppercase">
										{t.displayMode}
									</span>
								</div>
								{t.description && (
									<p className="mt-1 truncate text-muted-foreground text-sm">
										{t.description}
									</p>
								)}
							</div>
							<div className="flex shrink-0 items-center gap-1">
								<EditTraitDialog trait={t} onUpdated={invalidateList} />
								<DeleteTraitButton id={t.id} onDeleted={invalidateList} />
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="rounded-md border p-6 text-center text-muted-foreground text-sm">
					No traits yet. Create your first one.
				</div>
			)}

			<CreateTraitDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				realmId={realmId}
				onCreated={invalidateList}
			/>
		</div>
	);
}

export default TraitsManager;
