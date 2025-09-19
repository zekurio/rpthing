"use client";

import type { LucideIcon } from "lucide-react";
import { Settings, Shield, User, X } from "lucide-react";
import { useState } from "react";
import { AccountSettings } from "@/components/account-settings";
import { ProfileSettings } from "@/components/profile-settings";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type SettingsSection = "general" | "profile" | "account";

type Section = { id: SettingsSection; label: string; icon: LucideIcon };

const settingsSections: Section[] = [
	{
		id: "general",
		label: "General",
		icon: Settings,
	},
	{
		id: "profile",
		label: "Profile",
		icon: User,
	},
	{
		id: "account",
		label: "Account",
		icon: Shield,
	},
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
	const [activeSection, setActiveSection] =
		useState<SettingsSection>("general");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="h-[640px] overflow-hidden p-0 sm:max-w-3xl md:max-w-4xl"
			>
				<div className="flex h-full">
					{/* Sidebar */}
					<div className="flex w-64 flex-col border-r">
						<div className="px-4 py-3">
							<DialogClose asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									type="button"
								>
									<X className="h-4 w-4" />
									<span className="sr-only">Close</span>
								</Button>
							</DialogClose>
						</div>
						<nav className="flex-1 space-y-1 p-3">
							{settingsSections.map((section) => {
								const Icon = section.icon;
								return (
									<button
										key={section.id}
										onClick={() => setActiveSection(section.id)}
										className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
											activeSection === section.id
												? "bg-accent text-accent-foreground"
												: "hover:bg-accent"
										}`}
										type="button"
									>
										<Icon className="size-4" />
										<span className="font-medium">{section.label}</span>
									</button>
								);
							})}
						</nav>
					</div>

					{/* Content */}
					<div className="flex flex-1 flex-col">
						<DialogHeader className="border-b px-6 py-5">
							<DialogTitle className="font-semibold text-xl">
								{settingsSections.find((s) => s.id === activeSection)?.label}
							</DialogTitle>
						</DialogHeader>
						<div className="flex-1 overflow-y-auto px-6 py-6">
							{activeSection === "general" && <GeneralSettings />}
							{activeSection === "profile" && <ProfileSettings />}
							{activeSection === "account" && <AccountSettings />}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function GeneralSettings() {
	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<div>
					<h3 className="mb-1 font-medium text-lg">Theme</h3>
					<p className="mb-4 text-muted-foreground text-sm">
						Choose your preferred theme for the application.
					</p>
					<ThemeSwitcher />
				</div>
				<Separator />
			</div>
		</div>
	);
}
