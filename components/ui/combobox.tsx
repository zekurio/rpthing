"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ComboboxProps {
	options: readonly string[];
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	emptyText?: string;
	className?: string;
	disabled?: boolean;
	allowCustom?: boolean; // Allow typing custom values not in the list
}

export function Combobox({
	options,
	value,
	onValueChange,
	placeholder = "Select option...",
	emptyText = "No option found.",
	className,
	disabled = false,
	allowCustom = false,
}: ComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const [inputValue, setInputValue] = React.useState(value || "");
	const [filteredOptions, setFilteredOptions] = React.useState(options);

	// Update input value when external value changes
	React.useEffect(() => {
		setInputValue(value || "");
	}, [value]);

	// Filter options based on input
	React.useEffect(() => {
		if (!inputValue) {
			setFilteredOptions(options);
		} else {
			setFilteredOptions(
				options.filter((option) =>
					option.toLowerCase().includes(inputValue.toLowerCase()),
				),
			);
		}
	}, [options, inputValue]);

	const handleSelect = (selectedValue: string) => {
		onValueChange?.(selectedValue);
		setInputValue(selectedValue);
		setOpen(false);
	};

	const handleInputChange = (newValue: string) => {
		setInputValue(newValue);
		if (allowCustom) {
			onValueChange?.(newValue);
		}
	};

	const handleInputFocus = () => {
		setOpen(true);
	};

	const handleInputBlur = () => {
		// Delay closing to allow clicks on options
		setTimeout(() => setOpen(false), 150);
	};

	return (
		<div className={cn("relative", className)}>
			<Input
				value={inputValue}
				onChange={(e) => handleInputChange(e.target.value)}
				onFocus={handleInputFocus}
				onBlur={handleInputBlur}
				placeholder={placeholder}
				disabled={disabled}
				className="pr-8"
			/>
			<ChevronsUpDown className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-2 h-4 w-4 text-muted-foreground" />

			{open && filteredOptions.length > 0 && (
				<div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-background shadow-lg">
					{filteredOptions.map((option) => (
						<button
							key={option}
							type="button"
							className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
							onClick={() => handleSelect(option)}
						>
							<Check
								className={cn(
									"h-4 w-4",
									value === option ? "opacity-100" : "opacity-0",
								)}
							/>
							{option}
						</button>
					))}
				</div>
			)}

			{open && filteredOptions.length === 0 && inputValue && (
				<div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
					<div className="px-3 py-2 text-muted-foreground">{emptyText}</div>
				</div>
			)}
		</div>
	);
}
