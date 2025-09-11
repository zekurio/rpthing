import { Dices } from "lucide-react";

export function Logo() {
	return (
		<div className="flex items-center gap-2 self-center font-bold">
			<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
				<Dices className="size-4" />
			</div>
			<span className="translate-y-[-1px] text-xl leading-none">rpthing</span>
		</div>
	);
}
