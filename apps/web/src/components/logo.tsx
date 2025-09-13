import { Dices } from "lucide-react";

export function Logo() {
	return (
		<div className="flex items-center gap-3 self-center font-bold">
			<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
				<Dices className="size-5" />
			</div>
			<span className="translate-y-[-1px] font-medium text-2xl leading-none">
				rpthing
			</span>
		</div>
	);
}
