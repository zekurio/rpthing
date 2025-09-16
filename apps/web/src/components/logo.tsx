"use client";

import { Dices } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Logo() {
	const pathname = usePathname();
	const isRealmPage =
		pathname?.startsWith("/realms/") && pathname !== "/realms";

	return (
		<div className="flex items-center gap-3 self-center font-bold">
			{isRealmPage ? (
				<Link href="/realms" className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
						<Dices className="size-5" />
					</div>
					<span className="translate-y-[-1px] font-medium text-2xl leading-none">
						rpthing
					</span>
				</Link>
			) : (
				<>
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
						<Dices className="size-5" />
					</div>
					<span className="translate-y-[-1px] font-medium text-2xl leading-none">
						rpthing
					</span>
				</>
			)}
		</div>
	);
}
