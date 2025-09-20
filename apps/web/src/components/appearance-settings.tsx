"use client";

import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const accentColors = [
	{
		name: "Orange",
		value: "orange",
		light: "oklch(0.6716 0.1368 48.513)",
		dark: "oklch(0.7214 0.1337 49.9802)",
	},
	{
		name: "Blue",
		value: "blue",
		light: "oklch(0.594 0.0443 196.0233)",
		dark: "oklch(0.644 0.0443 196.0233)",
	},
	{
		name: "Purple",
		value: "purple",
		light: "oklch(0.6 0.15 300)",
		dark: "oklch(0.65 0.15 300)",
	},
	{
		name: "Green",
		value: "green",
		light: "oklch(0.65 0.15 140)",
		dark: "oklch(0.7 0.15 140)",
	},
	{
		name: "Pink",
		value: "pink",
		light: "oklch(0.65 0.15 330)",
		dark: "oklch(0.7 0.15 330)",
	},
	{
		name: "Red",
		value: "red",
		light: "oklch(0.65 0.15 25)",
		dark: "oklch(0.7 0.15 25)",
	},
];

// Initialize accent color on page load - should be called from the main app
export function initializeAccentColor() {
	const saved = localStorage.getItem("accent-color") || "orange";
	applyAccentColor(saved);
}

// Global function to apply accent color - can be called from anywhere
export function applyAccentColor(color: string) {
	const selectedColor = accentColors.find((c) => c.value === color);
	if (selectedColor) {
		const root = document.documentElement;
		const isDark = document.documentElement.classList.contains("dark");

		// Use appropriate color based on current theme
		const colorValue = isDark ? selectedColor.dark : selectedColor.light;

		root.style.setProperty("--primary", colorValue);
		root.style.setProperty("--ring", colorValue);
		root.style.setProperty("--sidebar-primary", colorValue);
		root.style.setProperty("--sidebar-ring", colorValue);
	}
}

export function AppearanceSettings() {
	const { theme, setTheme } = useTheme();
	const [selectedAccent, setSelectedAccent] = useState("orange");

	// Load saved accent color on mount
	useEffect(() => {
		const saved = localStorage.getItem("accent-color") || "orange";
		setSelectedAccent(saved);
		// Accent color is already applied globally by the providers component
	}, []);

	// Update accent color and save to localStorage
	const handleAccentChange = (value: string) => {
		setSelectedAccent(value);
		applyAccentColor(value);
		localStorage.setItem("accent-color", value);
	};

	return (
		<div className="space-y-3">
			<div className="space-y-2">
				<div>
					<h3 className="font-medium text-sm">Theme</h3>
					<p className="text-muted-foreground text-xs">
						Choose your preferred theme for the application.
					</p>
				</div>
				<Tabs value={theme} onValueChange={setTheme} className="w-full">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="light" className="flex items-center gap-1">
							<Sun className="h-3 w-3" />
						</TabsTrigger>
						<TabsTrigger value="dark" className="flex items-center gap-1">
							<Moon className="h-3 w-3" />
						</TabsTrigger>
						<TabsTrigger value="system" className="flex items-center gap-1">
							<Monitor className="h-3 w-3" />
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* Accent Color section */}
			<div className="space-y-2">
				<div>
					<h3 className="font-medium text-sm">Accent Color</h3>
					<p className="text-muted-foreground text-xs">
						Customize the accent color used throughout the application.
					</p>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
						<div className="flex items-center gap-2">
							<div
								className="h-4 w-4 rounded-full border"
								style={{
									backgroundColor: accentColors.find(
										(c) => c.value === selectedAccent,
									)?.[
										document.documentElement.classList.contains("dark")
											? "dark"
											: "light"
									],
								}}
							/>
							{accentColors.find((c) => c.value === selectedAccent)?.name}
						</div>
						<Palette className="h-4 w-4 opacity-50" />
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-56">
						{accentColors.map((color) => (
							<DropdownMenuItem
								key={color.value}
								onClick={() => handleAccentChange(color.value)}
								className="flex items-center gap-2"
							>
								<div
									className="h-4 w-4 rounded-full border"
									style={{ backgroundColor: color.light }}
								/>
								{color.name}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
