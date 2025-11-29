import { SidebarTrigger } from "@/components/ui/sidebar";

interface CharactersPageHeaderProps {
	filteredRealmName: string | null;
}

export function CharactersPageHeader({
	filteredRealmName,
}: CharactersPageHeaderProps) {
	return (
		<div className="sticky top-0 isolate z-10 flex h-14 items-center gap-2 border-border border-b bg-background/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:overflow-hidden md:rounded-t-xl">
			<SidebarTrigger />
			<div className="font-semibold">
				Characters
				{filteredRealmName && (
					<span className="ml-2 text-muted-foreground">
						in {filteredRealmName}
					</span>
				)}
			</div>
		</div>
	);
}
