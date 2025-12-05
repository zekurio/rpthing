import { SidebarTrigger } from "@/components/ui/sidebar";

interface CharactersPageHeaderProps {
	filteredRealmName: string | null;
}

export function CharactersPageHeader({
	filteredRealmName,
}: CharactersPageHeaderProps) {
	return (
		<div className="fixed top-0 right-0 left-0 z-20 flex h-14 items-center gap-2 border-border border-b bg-background/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:static md:z-10 md:overflow-hidden md:rounded-t-xl">
			<SidebarTrigger className="shrink-0" />
			<span className="font-semibold leading-none">
				Characters
				{filteredRealmName && (
					<span className="ml-2 text-muted-foreground">
						in {filteredRealmName}
					</span>
				)}
			</span>
		</div>
	);
}
