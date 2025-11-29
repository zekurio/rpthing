"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { TraitComparison } from "@/lib/character-filters";
import { gradeForValue } from "@/lib/traits";

interface TraitFilter {
	traitName: string;
	comparison: TraitComparison;
	value: number | null;
	min: number | null;
	max: number | null;
}

interface CharactersFilterDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	genderFilter: string | null;
	updateUrlParam: (key: string, value: string | null) => void;
	availableGenders: string[];
	availableTraitsToFilter: string[];
	traitFilters: TraitFilter[];
	addTraitFilter: (traitName: string) => void;
	getTraitDisplayMode: (traitName: string) => "number" | "grade";
	updateTraitFilter: (
		traitName: string,
		comparison: TraitComparison,
		value: number | null,
		min: number | null,
		max: number | null,
	) => void;
	removeTraitFilter: (traitName: string) => void;
	clearAllFiltersInDialog: () => void;
}

const comparisonOptions: { value: TraitComparison; label: string }[] = [
	{ value: "gte", label: "At least" },
	{ value: "lte", label: "At most" },
	{ value: "eq", label: "Exactly" },
	{ value: "between", label: "Between" },
];

function formatValue(value: number): string {
	const grade = gradeForValue(value);
	return `${value} (${grade})`;
}

interface TraitFilterSliderProps {
	filter: TraitFilter;
	updateTraitFilter: CharactersFilterDialogProps["updateTraitFilter"];
}

function TraitFilterSlider({
	filter,
	updateTraitFilter,
}: TraitFilterSliderProps) {
	const initialValue = filter.value ?? filter.min ?? filter.max ?? 10;
	const initialMin = filter.min ?? 1;
	const initialMax = filter.max ?? 20;

	// Local state for visual feedback while dragging
	const [localValue, setLocalValue] = useState(initialValue);
	const [localRange, setLocalRange] = useState<[number, number]>([
		initialMin,
		initialMax,
	]);

	// Sync local state when filter changes from outside
	useEffect(() => {
		setLocalValue(filter.value ?? filter.min ?? filter.max ?? 10);
		setLocalRange([filter.min ?? 1, filter.max ?? 20]);
	}, [filter.value, filter.min, filter.max]);

	if (filter.comparison === "between") {
		const currentMin = filter.min ?? 1;
		const currentMax = filter.max ?? 20;

		return (
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label className="text-muted-foreground text-xs">Range</Label>
					<span className="font-medium text-xs">
						{formatValue(localRange[0])} – {formatValue(localRange[1])}
					</span>
				</div>
				<Slider
					defaultValue={[currentMin, currentMax]}
					min={1}
					max={20}
					step={1}
					onValueChange={([min, max]) => {
						setLocalRange([min, max]);
					}}
					onValueCommit={([min, max]) => {
						updateTraitFilter(
							filter.traitName,
							filter.comparison,
							null,
							min,
							max,
						);
					}}
					className="py-2"
				/>
				<div className="flex justify-between text-[10px] text-muted-foreground">
					<span>1 (F)</span>
					<span>20 (S+)</span>
				</div>
			</div>
		);
	}

	const currentValue = filter.value ?? filter.min ?? filter.max ?? 10;

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label className="text-muted-foreground text-xs">Value</Label>
				<span className="font-medium text-xs">{formatValue(localValue)}</span>
			</div>
			<Slider
				defaultValue={[currentValue]}
				min={1}
				max={20}
				step={1}
				onValueChange={([value]) => {
					setLocalValue(value);
				}}
				onValueCommit={([value]) => {
					updateTraitFilter(
						filter.traitName,
						filter.comparison,
						value,
						filter.comparison === "lte" ? null : value,
						filter.comparison === "gte" ? null : value,
					);
				}}
				className="py-2"
			/>
			<div className="flex justify-between text-[10px] text-muted-foreground">
				<span>1 (F)</span>
				<span>20 (S+)</span>
			</div>
		</div>
	);
}

export function CharactersFilterDialog({
	open,
	onOpenChange,
	genderFilter,
	updateUrlParam,
	availableGenders,
	availableTraitsToFilter,
	traitFilters,
	addTraitFilter,
	getTraitDisplayMode,
	updateTraitFilter,
	removeTraitFilter,
	clearAllFiltersInDialog,
}: CharactersFilterDialogProps) {
	const hasActiveFilters = traitFilters.length > 0 || genderFilter;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Filters</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{availableGenders.length > 0 && (
						<div className="space-y-2">
							<Label className="font-medium text-xs">Gender</Label>
							<Select
								value={genderFilter ?? "all"}
								onValueChange={(value) =>
									updateUrlParam("gender", value === "all" ? null : value)
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="All genders" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All genders</SelectItem>
									{availableGenders.map((gender) => (
										<SelectItem key={gender} value={gender}>
											{gender}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{availableTraitsToFilter.length > 0 && (
						<div className="space-y-2">
							<Label className="font-medium text-xs">Add trait filter</Label>
							<Select
								value=""
								onValueChange={(traitName) => {
									if (traitName) {
										addTraitFilter(traitName);
									}
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select a trait..." />
								</SelectTrigger>
								<SelectContent>
									{availableTraitsToFilter.map((traitName) => (
										<SelectItem key={traitName} value={traitName}>
											{traitName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{traitFilters.length > 0 && (
						<div className="max-h-72 space-y-3 overflow-y-auto">
							{traitFilters.map((filter) => {
								const displayMode = getTraitDisplayMode(filter.traitName);

								return (
									<div
										key={filter.traitName}
										className="space-y-3 rounded-lg border bg-muted/30 p-3"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<span className="font-medium text-xs">
													{filter.traitName}
												</span>
												<span className="text-muted-foreground text-xs capitalize">
													({displayMode})
												</span>
											</div>
											<Button
												variant="ghost"
												size="sm"
												className="h-6 px-2 text-muted-foreground hover:text-foreground"
												onClick={() => removeTraitFilter(filter.traitName)}
												aria-label="Remove trait filter"
											>
												<X className="h-3 w-3" />
											</Button>
										</div>

										{/* Comparison type selector */}
										<div className="space-y-1">
											<Label className="text-muted-foreground text-xs">
												Condition
											</Label>
											<Select
												value={filter.comparison}
												onValueChange={(value: TraitComparison) => {
													// Set default values based on comparison type
													let newValue: number | null = filter.value ?? 10;
													let newMin = filter.min;
													let newMax = filter.max;

													if (value === "between") {
														newMin = filter.min ?? filter.value ?? 1;
														newMax = filter.max ?? filter.value ?? 20;
														newValue = null;
													} else {
														newValue =
															filter.value ?? filter.min ?? filter.max ?? 10;
														if (value === "gte") {
															newMin = newValue;
															newMax = null;
														} else if (value === "lte") {
															newMin = null;
															newMax = newValue;
														} else {
															newMin = newValue;
															newMax = newValue;
														}
													}

													updateTraitFilter(
														filter.traitName,
														value,
														newValue,
														newMin,
														newMax,
													);
												}}
											>
												<SelectTrigger className="h-8">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{comparisonOptions.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										{/* Slider for value selection */}
										<TraitFilterSlider
											filter={filter}
											updateTraitFilter={updateTraitFilter}
										/>
									</div>
								);
							})}
						</div>
					)}

					{traitFilters.length === 0 &&
						availableTraitsToFilter.length === 0 &&
						availableGenders.length === 0 && (
							<p className="text-center text-muted-foreground text-sm">
								No filters available
							</p>
						)}

					{hasActiveFilters && (
						<div className="border-t pt-4">
							<Button
								variant="outline"
								size="sm"
								onClick={clearAllFiltersInDialog}
								className="w-full"
							>
								<X className="mr-2 h-4 w-4" />
								Clear all filters
							</Button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
