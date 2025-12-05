"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
	creatorFilter: string | null;
	updateUrlParam: (key: string, value: string | null) => void;
	availableGenders: string[];
	availableCreators: string[];
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

const COMPARISON_OPTIONS: { value: TraitComparison; label: string }[] = [
	{ value: "gte", label: "At least" },
	{ value: "lte", label: "At most" },
	{ value: "eq", label: "Exactly" },
	{ value: "between", label: "Between" },
];

function formatTraitValue(value: number): string {
	return `${value} (${gradeForValue(value)})`;
}

function FilterSelect({
	label,
	value,
	placeholder,
	options,
	onChange,
}: {
	label: string;
	value: string | null;
	placeholder: string;
	options: string[];
	onChange: (value: string | null) => void;
}) {
	return (
		<div className="space-y-1.5">
			<Label className="text-sm">{label}</Label>
			<Select
				value={value ?? "all"}
				onValueChange={(v) => onChange(v === "all" ? null : v)}
			>
				<SelectTrigger>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">{placeholder}</SelectItem>
					{options.map((option) => (
						<SelectItem key={option} value={option}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function TraitFilterCard({
	filter,
	displayMode,
	onUpdate,
	onRemove,
}: {
	filter: TraitFilter;
	displayMode: "number" | "grade";
	onUpdate: CharactersFilterDialogProps["updateTraitFilter"];
	onRemove: () => void;
}) {
	const [localValue, setLocalValue] = useState(
		filter.value ?? filter.min ?? filter.max ?? 10,
	);
	const [localRange, setLocalRange] = useState<[number, number]>([
		filter.min ?? 1,
		filter.max ?? 20,
	]);

	useEffect(() => {
		setLocalValue(filter.value ?? filter.min ?? filter.max ?? 10);
		setLocalRange([filter.min ?? 1, filter.max ?? 20]);
	}, [filter.value, filter.min, filter.max]);

	const handleComparisonChange = (comparison: TraitComparison) => {
		let newValue: number | null = filter.value ?? 10;
		let newMin = filter.min;
		let newMax = filter.max;

		if (comparison === "between") {
			newMin = filter.min ?? filter.value ?? 1;
			newMax = filter.max ?? filter.value ?? 20;
			newValue = null;
		} else {
			newValue = filter.value ?? filter.min ?? filter.max ?? 10;
			newMin = comparison === "lte" ? null : newValue;
			newMax = comparison === "gte" ? null : newValue;
		}

		onUpdate(filter.traitName, comparison, newValue, newMin, newMax);
	};

	const isBetween = filter.comparison === "between";

	return (
		<div className="space-y-3 border border-border bg-muted/30 p-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="font-medium text-sm">{filter.traitName}</span>
					<span className="text-muted-foreground text-xs capitalize">
						({displayMode})
					</span>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6 text-muted-foreground hover:text-foreground"
					onClick={onRemove}
				>
					<X className="h-3 w-3" />
				</Button>
			</div>

			<Select
				value={filter.comparison}
				onValueChange={(v) => handleComparisonChange(v as TraitComparison)}
			>
				<SelectTrigger className="h-8">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{COMPARISON_OPTIONS.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<div className="space-y-2">
				<div className="flex justify-between text-xs">
					<span className="text-muted-foreground">
						{isBetween ? "Range" : "Value"}
					</span>
					<span className="font-medium">
						{isBetween
							? `${formatTraitValue(localRange[0])} – ${formatTraitValue(localRange[1])}`
							: formatTraitValue(localValue)}
					</span>
				</div>
				<Slider
					value={isBetween ? localRange : [localValue]}
					min={1}
					max={20}
					step={1}
					onValueChange={(vals) => {
						if (isBetween) {
							setLocalRange([vals[0], vals[1]]);
						} else {
							setLocalValue(vals[0]);
						}
					}}
					onValueCommit={(vals) => {
						if (isBetween) {
							onUpdate(
								filter.traitName,
								filter.comparison,
								null,
								vals[0],
								vals[1],
							);
						} else {
							onUpdate(
								filter.traitName,
								filter.comparison,
								vals[0],
								filter.comparison === "lte" ? null : vals[0],
								filter.comparison === "gte" ? null : vals[0],
							);
						}
					}}
				/>
				<div className="flex justify-between text-[10px] text-muted-foreground">
					<span>1 (F)</span>
					<span>20 (S+)</span>
				</div>
			</div>
		</div>
	);
}

export function CharactersFilterDialog({
	open,
	onOpenChange,
	genderFilter,
	creatorFilter,
	updateUrlParam,
	availableGenders,
	availableCreators,
	availableTraitsToFilter,
	traitFilters,
	addTraitFilter,
	getTraitDisplayMode,
	updateTraitFilter,
	removeTraitFilter,
	clearAllFiltersInDialog,
}: CharactersFilterDialogProps) {
	const hasFilters = traitFilters.length > 0 || genderFilter || creatorFilter;
	const hasNoOptions =
		availableCreators.length <= 1 &&
		availableGenders.length === 0 &&
		availableTraitsToFilter.length === 0 &&
		traitFilters.length === 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Filter characters</DialogTitle>
					<DialogDescription>
						Filter characters by traits, gender, and creator.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 pt-2">
					{availableCreators.length > 1 && (
						<FilterSelect
							label="Creator"
							value={creatorFilter}
							placeholder="All creators"
							options={availableCreators}
							onChange={(v) => updateUrlParam("creator", v)}
						/>
					)}

					{availableGenders.length > 0 && (
						<FilterSelect
							label="Gender"
							value={genderFilter}
							placeholder="All genders"
							options={availableGenders}
							onChange={(v) => updateUrlParam("gender", v)}
						/>
					)}

					{availableTraitsToFilter.length > 0 && (
						<div className="space-y-1.5">
							<Label className="text-sm">Add trait filter</Label>
							<Select value="" onValueChange={(v) => v && addTraitFilter(v)}>
								<SelectTrigger>
									<SelectValue placeholder="Select a trait..." />
								</SelectTrigger>
								<SelectContent>
									{availableTraitsToFilter.map((trait) => (
										<SelectItem key={trait} value={trait}>
											{trait}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{traitFilters.length > 0 && (
						<div className="max-h-64 space-y-3 overflow-y-auto">
							{traitFilters.map((filter) => (
								<TraitFilterCard
									key={filter.traitName}
									filter={filter}
									displayMode={getTraitDisplayMode(filter.traitName)}
									onUpdate={updateTraitFilter}
									onRemove={() => removeTraitFilter(filter.traitName)}
								/>
							))}
						</div>
					)}

					{hasNoOptions && (
						<p className="py-4 text-center text-muted-foreground text-sm">
							No filters available
						</p>
					)}

					{hasFilters && (
						<Button
							variant="outline"
							size="sm"
							onClick={clearAllFiltersInDialog}
							className="w-full"
						>
							<X className="mr-2 h-4 w-4" />
							Clear all filters
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
