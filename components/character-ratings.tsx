"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { CharacterWithRatings } from "@types";
import { X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { gradeForValue } from "@/lib/traits";
import { queryClient, trpc } from "@/lib/trpc";

interface CharacterRatingsProps {
	characterId: string;
}

export function CharacterRatings({ characterId }: CharacterRatingsProps) {
	const { data, isLoading } = useQuery({
		...trpc.character.getWithRatings.queryOptions({ id: characterId }),
		enabled: !!characterId,
	});

	// Also subscribe to trait list for this character's realm to react to display mode changes
	const realmId = data?.realmId;
	const { data: traitSnapshot } = useQuery({
		...trpc.trait.list.queryOptions({ realmId: (realmId ?? "") as string }),
		enabled: !!realmId,
	});
	React.useEffect(() => {
		if (!realmId) return;
		if (traitSnapshot) {
			queryClient.invalidateQueries({
				queryKey: trpc.character.getWithRatings.queryKey({ id: characterId }),
			});
		}
	}, [realmId, traitSnapshot, characterId]);

	const upsert = useMutation({
		...trpc.character.ratings.upsert.mutationOptions(),
		onMutate: (vars) => {
			const key = trpc.character.getWithRatings.queryKey({ id: characterId });
			void queryClient.cancelQueries({ queryKey: key });
			queryClient.setQueryData(
				key,
				(old: CharacterWithRatings | null | undefined) => {
					if (!old) return old;
					return {
						...old,
						traits: old.traits.map((t) => {
							const next = { ...t, description: t.description ?? null };
							if (t.traitId !== vars.traitId) return next;
							return {
								...next,
								value: typeof vars.value === "number" ? vars.value : null,
								ratingId: t.ratingId ?? "optimistic",
							};
						}),
					};
				},
			);
			return undefined;
		},
		onError: (e) => {
			toast.error(e.message || "Failed to save rating");
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.character.getWithRatings.queryKey({ id: characterId }),
			});
		},
	});

	const del = useMutation({
		...trpc.character.ratings.delete.mutationOptions(),
		onMutate: (ratingId) => {
			const key = trpc.character.getWithRatings.queryKey({ id: characterId });
			void queryClient.cancelQueries({ queryKey: key });
			queryClient.setQueryData(
				key,
				(old: CharacterWithRatings | null | undefined) => {
					if (!old) return old;
					return {
						...old,
						traits: old.traits.map((t) => {
							const next = { ...t, description: t.description ?? null };
							if (t.ratingId !== ratingId) return next;
							return { ...next, value: null, ratingId: null };
						}),
					};
				},
			);
			return undefined;
		},
		onError: (e) => {
			toast.error(e.message || "Failed to clear rating");
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.character.getWithRatings.queryKey({ id: characterId }),
			});
		},
	});

	const [localValues, setLocalValues] = React.useState<Record<string, number>>(
		{},
	);
	const timersRef = React.useRef<
		Record<string, ReturnType<typeof setTimeout> | null>
	>({});

	React.useEffect(() => {
		if (!data) return;
		const next: Record<string, number> = {};
		for (const t of data.traits) {
			if (typeof t.value === "number") next[t.traitId] = t.value;
		}
		setLocalValues(next);
	}, [data]);

	const requestSave = React.useCallback(
		(traitId: string, value: number) => {
			const timer = timersRef.current[traitId];
			if (timer) {
				clearTimeout(timer);
			}
			timersRef.current[traitId] = setTimeout(() => {
				upsert.mutate({ characterId, traitId, value });
			}, 300);
		},
		[characterId, upsert],
	);

	if (isLoading) {
		return (
			<div className="grid gap-4">
				{[
					"rating-skeleton-1",
					"rating-skeleton-2",
					"rating-skeleton-3",
					"rating-skeleton-4",
				].map((key) => (
					<div key={key} className="grid gap-2">
						<Skeleton size="sm" className="w-40" />
						<Skeleton size="xs" className="w-full" />
					</div>
				))}
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className="grid gap-4">
			{data.traits.length === 0 ? (
				<div className="rounded-md border p-3 text-muted-foreground text-sm">
					No traits in this realm yet.
				</div>
			) : (
				data.traits.map((t) => {
					const current = localValues[t.traitId] ?? 10;
					const isSet =
						typeof t.value === "number" ||
						typeof localValues[t.traitId] === "number";
					const label =
						t.displayMode === "grade"
							? gradeForValue(current)
							: String(current);
					const canClear = Boolean(isSet);
					return (
						<div key={t.traitId} className="grid gap-2">
							<div className="flex items-center justify-between gap-2">
								<div className="min-w-0">
									<div className="truncate font-medium text-sm">
										{t.traitName}
									</div>
									{t.description ? (
										<div className="truncate text-muted-foreground text-xs">
											{t.description}
										</div>
									) : null}
								</div>
								<div className="flex items-center gap-2">
									<span className="text-muted-foreground text-xs">
										{isSet ? label : "Not set"}
									</span>
									{canClear ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
											onClick={() => {
												if (t.ratingId && t.ratingId !== "optimistic") {
													del.mutate(t.ratingId as string);
												} else {
													const timer = timersRef.current[t.traitId];
													if (timer) clearTimeout(timer);
													timersRef.current[t.traitId] = null;
													setLocalValues((prev) => {
														const { [t.traitId]: _omit, ...rest } = prev;
														return rest;
													});
												}
											}}
											disabled={del.isPending}
											aria-label="Clear rating"
										>
											<X className="h-3 w-3" />
										</Button>
									) : null}
								</div>
							</div>
							<Slider
								min={1}
								max={20}
								step={1}
								value={[current]}
								onValueChange={(vals) => {
									const v = vals[0] ?? 10;
									setLocalValues((prev) => ({ ...prev, [t.traitId]: v }));
									requestSave(t.traitId, v);
								}}
							/>
						</div>
					);
				})
			)}
		</div>
	);
}
