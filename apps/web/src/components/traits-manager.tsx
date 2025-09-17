"use client";

import { useQuery } from "@tanstack/react-query";
import { Hash, Plus, Star } from "lucide-react";
import { useCallback, useState } from "react";
import { CreateTraitDialog } from "@/components/create-trait-dialog";
import { DeleteTraitButton } from "@/components/delete-trait-button";
import { EditTraitDialog } from "@/components/edit-trait-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Trait } from "@/types";
import { queryClient, trpc } from "@/utils/trpc";

interface TraitsManagerProps {
	realmId: string;
}

function TraitCard({
	trait,
	onUpdated,
	onDeleted,
}: {
	trait: Trait;
	onUpdated: () => void;
	onDeleted: () => void;
}) {
	const DisplayModeIcon = trait.displayMode === "grade" ? Star : Hash;

	return (
		<div className="group relative min-h-[5rem] overflow-hidden rounded-lg border bg-gradient-to-br from-card to-card/80 p-4 shadow-sm transition-all duration-200 hover:shadow-md">
			<div className="flex h-full items-start justify-between gap-3">
				<div className="min-w-0 flex-1 space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<h4 className="break-words font-semibold text-sm leading-tight">
							{trait.name}
						</h4>
						<div className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
							<DisplayModeIcon className="h-3 w-3" />
							<span className="capitalize">{trait.displayMode}</span>
						</div>
					</div>
					{trait.description && (
						<p className="break-words text-muted-foreground text-xs leading-relaxed">
							{trait.description}
						</p>
					)}
				</div>
				<div className="flex shrink-0 items-start gap-1">
					<EditTraitDialog trait={trait} onUpdated={onUpdated} />
					<DeleteTraitButton id={trait.id} onDeleted={onDeleted} />
				</div>
			</div>
		</div>
	);
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
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h3 className="font-bold text-xl tracking-tight">Traits</h3>
					<p className="mt-1 text-muted-foreground text-sm">
						{traits?.length || 0} trait{traits?.length === 1 ? "" : "s"} defined
					</p>
				</div>
				<Button
					size="sm"
					onClick={() => setCreateOpen(true)}
					className="shrink-0"
				>
					<Plus className="mr-2 h-4 w-4" />
					Add Trait
				</Button>
			</div>

			{isLoading ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{[
						"trait-skel-1",
						"trait-skel-2",
						"trait-skel-3",
						"trait-skel-4",
						"trait-skel-5",
						"trait-skel-6",
					].map((key) => (
						<Skeleton key={key} className="h-20 w-full rounded-lg" />
					))}
				</div>
			) : traits && traits.length > 0 ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{traits.map((trait) => (
						<TraitCard
							key={trait.id}
							trait={trait}
							onUpdated={invalidateList}
							onDeleted={invalidateList}
						/>
					))}
				</div>
			) : (
				<div className="flex min-h-[12rem] flex-col items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed p-8 text-center">
					<div className="mb-4 rounded-full bg-muted p-3">
						<Star className="h-6 w-6 text-muted-foreground" />
					</div>
					<h4 className="mb-1 font-semibold text-sm">No traits yet</h4>
					<p className="mb-4 max-w-sm text-muted-foreground text-xs">
						Create traits to define characteristics that characters can be rated
						on.
					</p>
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
