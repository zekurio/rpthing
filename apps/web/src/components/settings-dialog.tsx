"use client";

import type { LucideIcon } from "lucide-react";
import { Palette, Shield, User, X } from "lucide-react";
import { useState } from "react";
import { AccountSettings } from "@/components/account-settings";
import { AppearanceSettings } from "@/components/appearance-settings";
import { ProfileSettings } from "@/components/profile-settings";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type SettingsSection = "appearance" | "profile" | "account";

type Section = { id: SettingsSection; label: string; icon: LucideIcon };

const settingsSections: Section[] = [
	{
		id: "appearance",
		label: "Appearance",
		icon: Palette,
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
		useState<SettingsSection>("appearance");
	const isMobile = useIsMobile();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className={`h-[480px] overflow-hidden p-0 ${
					isMobile ? "w-full max-w-[95vw]" : "sm:max-w-2xl md:max-w-3xl"
				}`}
			>
				<DialogHeader className="sr-only">
					<DialogTitle>Settings</DialogTitle>
				</DialogHeader>
				<div className="flex h-full flex-col">
					{isMobile ? (
						<>
							{/* Mobile Header */}
							<div className="flex items-center justify-between border-b px-3 py-1.5">
								<h2 className="font-semibold text-sm">
									{settingsSections.find((s) => s.id === activeSection)?.label}
								</h2>
								<DialogClose asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7"
										type="button"
									>
										<X className="h-3.5 w-3.5" />
										<span className="sr-only">Close</span>
									</Button>
								</DialogClose>
							</div>

							{/* Mobile Navigation Tabs */}
							<div className="flex border-b bg-muted/50">
								{settingsSections.map((section) => {
									const Icon = section.icon;
									return (
										<button
											key={section.id}
											onClick={() => setActiveSection(section.id)}
											className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs transition-colors ${
												activeSection === section.id
													? "bg-primary/10 text-primary"
													: "text-muted-foreground hover:text-foreground"
											}`}
											type="button"
										>
											<Icon className="size-3.5" />
											<span>{section.label}</span>
										</button>
									);
								})}
							</div>

							{/* Mobile Content */}
							<div className="flex-1 overflow-y-auto px-3 py-3">
								{activeSection === "appearance" && <AppearanceSettings />}
								{activeSection === "profile" && <ProfileSettings />}
								{activeSection === "account" && <AccountSettings />}
							</div>
						</>
					) : (
						<div className="flex h-full">
							{/* Desktop Sidebar */}
							<div className="flex w-52 flex-col border-r">
								<div className="px-2 py-1.5">
									<DialogClose asChild>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7"
											type="button"
										>
											<X className="h-3.5 w-3.5" />
											<span className="sr-only">Close</span>
										</Button>
									</DialogClose>
								</div>
								<nav className="flex-1 space-y-1 p-2">
									{settingsSections.map((section) => {
										const Icon = section.icon;
										return (
											<button
												key={section.id}
												onClick={() => setActiveSection(section.id)}
												className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors ${
													activeSection === section.id
														? "bg-primary/10 font-medium text-primary"
														: "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
												}`}
												type="button"
											>
												<Icon className="size-4" />
												<span className="font-medium text-sm">
													{section.label}
												</span>
											</button>
										);
									})}
								</nav>
							</div>

							{/* Desktop Content */}
							<div className="flex flex-1 flex-col">
								<DialogHeader className="border-b px-3 py-2">
									<DialogTitle className="font-semibold text-base">
										{
											settingsSections.find((s) => s.id === activeSection)
												?.label
										}
									</DialogTitle>
								</DialogHeader>
								<div className="flex-1 overflow-y-auto px-3 py-3">
									{activeSection === "appearance" && <AppearanceSettings />}
									{activeSection === "profile" && <ProfileSettings />}
									{activeSection === "account" && <AccountSettings />}
								</div>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
