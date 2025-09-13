"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { AccountSettings } from "@/components/account-settings";
import { ProfileSettings } from "@/components/profile-settings";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
	const router = useRouter();

	return (
		<>
			<SiteHeader />
			<main className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
				<header className="relative">
					<Button
						variant="ghost"
						onClick={() => router.back()}
						className="-left-2 -top-2 absolute flex items-center gap-2 px-3 py-2 text-base"
					>
						<ArrowLeft className="size-5" />
						Back
					</Button>
					<div className="pt-12">
						<h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
						<p className="text-muted-foreground text-sm">
							Manage your account preferences and security.
						</p>
					</div>
				</header>

				<Tabs defaultValue="profile" className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="profile">Profile</TabsTrigger>
						<TabsTrigger value="account">Account</TabsTrigger>
					</TabsList>
					<TabsContent value="profile" className="mt-6">
						<ProfileSettings />
					</TabsContent>
					<TabsContent value="account" className="mt-6">
						<AccountSettings />
					</TabsContent>
				</Tabs>
			</main>
		</>
	);
}
