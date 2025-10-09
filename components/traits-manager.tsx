"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { Trait } from "@types";
import { Hash, Plus, Star, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateTraitDialog } from "@/components/create-trait-dialog";
import { EditTraitDialog } from "@/components/edit-trait-dialog";
import { FilterDropdown, type FilterState } from "@/components/filter-dropdown";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, trpc } from "@/lib/trpc";

interface TraitsManagerProps {
	realmId: string;
	enabled?: boolean;
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
	const [deleteOpen, setDeleteOpen] = useState(false);
	const DisplayModeIcon = trait.displayMode === "grade" ? Star : Hash;

	const deleteMutation = useMutation({
		...trpc.trait.delete.mutationOptions(),
		onSuccess: () => {
			onDeleted();
			// Invalidate characters with ratings so UI reflects removal
			queryClient.invalidateQueries({
				predicate: (q) =>
					JSON.stringify(q.queryKey).includes("character.getWithRatings"),
			});
			toast.success("Trait deleted");
			setDeleteOpen(false);
		},
		onError: (err) => toast.error(err.message || "Failed to delete trait"),
	});

	const confirmDelete = useCallback(async () => {
		await deleteMutation.mutateAsync(trait.id);
	}, [deleteMutation, trait.id]);

	return (
		<>
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
						<Button
							variant="ghost"
							size="sm"
							className="text-destructive"
							onClick={() => setDeleteOpen(true)}
							aria-label="Delete trait"
						>
							<Trash2 className="h-3 w-3" />
						</Button>
					</div>
				</div>
			</div>
			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete trait?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

export function TraitsManager({ realmId, enabled = true }: TraitsManagerProps) {
	const { data: traits, isLoading } = useQuery({
		...trpc.trait.list.queryOptions({ realmId }),
		enabled,
	});

	const [createOpen, setCreateOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [filters, setFilters] = useState<FilterState>({
		gender: null,
		creator: null,
		traitFilters: {},
	});

	// Get available creators for filter options
	const availableCreators = useMemo(() => {
		if (!traits) return [];
		const creators = new Set<string>();
		traits.forEach((t) => {
			if (t.createdByName) creators.add(t.createdByName);
		});
		return Array.from(creators).sort();
	}, [traits]);

	const filteredTraits = useMemo(() => {
		if (!traits) return [];

		let filtered = traits;

		// Apply search filter
		const query = search.trim().toLowerCase();
		if (query) {
			filtered = filtered.filter(
				(t) =>
					t.name.toLowerCase().includes(query) ||
					(t.description ? t.description.toLowerCase().includes(query) : false),
			);
		}

		// Apply creator filter
		if (filters.creator) {
			filtered = filtered.filter((t) => t.createdByName === filters.creator);
		}

		// Note: Gender and score filters don't apply to traits directly
		// They would be used for filtering characters that use these traits

		return filtered;
	}, [traits, search, filters]);

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
						{filteredTraits?.length || 0} trait
						{filteredTraits?.length === 1 ? "" : "s"} found
					</p>
				</div>
				<Button
					size="sm"
					onClick={() => setCreateOpen(true)}
					className="shrink-0"
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>
			<div className="flex gap-2">
				<Input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search traits..."
					aria-label="Search traits"
					className="flex-1"
				/>
				<FilterDropdown
					realmId={realmId}
					filters={filters}
					onFiltersChange={setFilters}
					availableCreators={availableCreators}
					availableTraits={traits || []}
				/>
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
						<div
							key={key}
							className="min-h-[5rem] overflow-hidden rounded-lg border bg-gradient-to-br from-card to-card/80 p-4 shadow-sm"
						>
							<div className="flex h-full items-start justify-between gap-3">
								<div className="min-w-0 flex-1 space-y-2">
									<div className="flex flex-wrap items-center gap-2">
										<Skeleton size="sm" className="w-24" />
										<Skeleton size="xs" className="w-16" />
									</div>
									<Skeleton size="xs" className="w-full" />
								</div>
								<Skeleton size="xs" className="rounded-full" />
							</div>
						</div>
					))}
				</div>
			) : filteredTraits && filteredTraits.length > 0 ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{filteredTraits.map((trait) => (
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
					<h4 className="mb-1 font-semibold text-sm">
						{search ? "No matching traits" : "No traits yet"}
					</h4>
					<p className="mb-4 max-w-sm text-muted-foreground text-xs">
						{search
							? "Try a different search term."
							: "Create traits to define characteristics that characters can be rated on."}
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
