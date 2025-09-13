import { Dices } from "lucide-react";

export function Logo() {
	return (
		<div className="flex items-center gap-5 self-center font-bold">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
				<Dices className="size-6" />
			</div>
			<span className="translate-y-[-1px] text-2xl leading-none">rpthing</span>
		</div>
	);
}
