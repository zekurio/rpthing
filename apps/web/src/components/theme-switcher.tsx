"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ThemeSwitcher() {
	const { theme, setTheme } = useTheme();

	return (
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
	);
}
