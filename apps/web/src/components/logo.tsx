import { Dices } from "lucide-react";
import Link from "next/link";

export function Logo() {
	return (
		<div className="flex items-center gap-3 self-center font-bold">
			<Link href="/realms" className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
					<Dices className="size-5 text-neutral-900" />
				</div>
				<span className="translate-y-[-1px] font-medium text-2xl leading-none">
					rpthing
				</span>
			</Link>
		</div>
	);
}
