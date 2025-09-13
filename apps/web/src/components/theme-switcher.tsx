"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ThemeSwitcher() {
	const { theme, setTheme } = useTheme();

	return (
		<div className="px-3 py-2">
			<div className="mb-2 font-medium text-muted-foreground text-xs">
				Theme
			</div>
			<Tabs value={theme} onValueChange={setTheme} className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="light" className="flex items-center gap-1">
						<Sun className="h-3 w-3" />
						Light
					</TabsTrigger>
					<TabsTrigger value="dark" className="flex items-center gap-1">
						<Moon className="h-3 w-3" />
						Dark
					</TabsTrigger>
					<TabsTrigger value="system" className="flex items-center gap-1">
						<Monitor className="h-3 w-3" />
						System
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	);
}
