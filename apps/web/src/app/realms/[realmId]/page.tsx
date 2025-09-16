"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import NotFound from "@/app/not-found";
import { MemberSidebar } from "@/components/member-sidebar";
import { RealmSidebar } from "@/components/realm-sidebar";
import { SiteHeader } from "@/components/site-header";
import { TraitsManager } from "@/components/traits-manager";
import { Dialog, DialogOverlay } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRealmAccess } from "@/hooks/use-realm-access";

export default function RealmPage() {
	const params = useParams();
	const realmId = params.realmId as string;
	const isMobile = useIsMobile();
	const [membersOpen, setMembersOpen] = useState(false);

	const { realm, isLoading, hasAccess, shouldShowNotFound } =
		useRealmAccess(realmId);

	// If access is denied, render the not-found page
	if (shouldShowNotFound) {
		return <NotFound />;
	}

	// Show loading state while checking access
	if (isLoading) {
		return (
			<div className="flex h-full min-h-0 w-full flex-col">
				<SiteHeader />
				<div className="flex h-full min-h-0">
					<RealmSidebar />
					<main className="flex-1 p-4">
						<div className="space-y-4">
							<Skeleton className="h-8 w-48" />
							<Skeleton className="h-4 w-96" />
							<Skeleton className="h-32 w-full" />
						</div>
					</main>
					<div className="p-4">
						<MemberSidebar realmId={realmId} />
					</div>
				</div>
				{isMobile ? (
					<MobileMembersSheet
						open={false}
						onOpenChange={() => {}}
						realmId={realmId}
					/>
				) : null}
				{isMobile ? (
					<RightEdgeSwipeActivator enabled onOpen={() => {}} />
				) : null}
			</div>
		);
	}

	// If no access or no realm data, return null
	if (!hasAccess || !realm) {
		return null;
	}

	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			<SiteHeader />
			<div className="flex h-full min-h-0">
				<RealmSidebar />
				<main className="flex-1 p-4">
					<div className="space-y-6">
						<div>
							<h1 className="font-bold text-2xl">{realm.name}</h1>
							<p className="text-muted-foreground">{realm.description}</p>
						</div>

						<Tabs defaultValue="characters" className="w-full">
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="characters">Characters</TabsTrigger>
								<TabsTrigger value="traits">Traits</TabsTrigger>
								<TabsTrigger value="notes">Notes</TabsTrigger>
							</TabsList>
							<TabsContent value="characters" className="mt-6">
								<div className="rounded-lg border p-6">
									<h3 className="mb-4 font-semibold text-lg">Characters</h3>
									<p className="text-muted-foreground">
										Character management will be implemented here.
									</p>
								</div>
							</TabsContent>
							<TabsContent value="traits" className="mt-6">
								<div className="rounded-lg border p-6">
									<TraitsManager realmId={realm.id} />
								</div>
							</TabsContent>
							<TabsContent value="notes" className="mt-6">
								<div className="rounded-lg border p-6">
									<h3 className="mb-4 font-semibold text-lg">Notes</h3>
									<p className="text-muted-foreground">
										Note management will be implemented here.
									</p>
								</div>
							</TabsContent>
						</Tabs>
					</div>
				</main>
				<div className="">
					<MemberSidebar realmId={realmId} />
				</div>
			</div>

			{/* Mobile members drawer and right-edge swipe activator */}
			{isMobile ? (
				<MobileMembersSheet
					open={membersOpen}
					onOpenChange={setMembersOpen}
					realmId={realmId}
				/>
			) : null}
			{isMobile ? (
				<RightEdgeSwipeActivator
					enabled={!membersOpen}
					onOpen={() => setMembersOpen(true)}
				/>
			) : null}
		</div>
	);
}

function MobileMembersSheet({
	open,
	onOpenChange,
	realmId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	realmId: string;
}) {
	const draggingRef = useRef(false);
	const startXRef = useRef(0);
	const startYRef = useRef(0);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogOverlay />
			<DialogPrimitive.Content
				className="fixed inset-y-0 right-0 z-50 h-full w-64 bg-background shadow-lg outline-hidden transition-transform duration-200 data-[state=closed]:translate-x-full data-[state=open]:translate-x-0 sm:w-72"
				onPointerDown={(e) => {
					draggingRef.current = true;
					startXRef.current = e.clientX;
					startYRef.current = e.clientY;
					(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
				}}
				onPointerMove={(e) => {
					if (!draggingRef.current) return;
					const dx = e.clientX - startXRef.current;
					const dy = e.clientY - startYRef.current;
					if (dx > 40 && Math.abs(dy) < 30) {
						draggingRef.current = false;
						onOpenChange(false);
					}
				}}
				onPointerUp={() => {
					draggingRef.current = false;
				}}
			>
				<DialogPrimitive.Title className="sr-only">
					Members
				</DialogPrimitive.Title>
				<button
					type="button"
					className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background/80 text-foreground"
					onClick={() => onOpenChange(false)}
					aria-label="Close members"
				>
					<X className="h-4 w-4" />
				</button>
				<MemberSidebar realmId={realmId} forceVisible />
			</DialogPrimitive.Content>
		</Dialog>
	);
}

function RightEdgeSwipeActivator({
	enabled,
	onOpen,
}: {
	enabled: boolean;
	onOpen: () => void;
}) {
	const trackingRef = useRef(false);
	const startXRef = useRef(0);
	const startYRef = useRef(0);

	if (!enabled) return null;

	return (
		<div
			aria-hidden
			className="fixed inset-y-0 right-0 z-40 w-16 touch-pan-y sm:hidden"
			onPointerDown={(e) => {
				trackingRef.current = true;
				startXRef.current = e.clientX;
				startYRef.current = e.clientY;
				(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
			}}
			onPointerMove={(e) => {
				if (!trackingRef.current) return;
				const dx = e.clientX - startXRef.current;
				const dy = e.clientY - startYRef.current;
				if (dx < -30 && Math.abs(dy) < 30) {
					trackingRef.current = false;
					onOpen();
				}
			}}
			onPointerUp={() => {
				trackingRef.current = false;
			}}
		/>
	);
}
