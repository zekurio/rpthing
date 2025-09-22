import { Dices } from "lucide-react";

interface LogoProps {
	className?: string;
}

export function Logo({ className }: LogoProps) {
	return (
		<div className={`flex items-center gap-3 ${className || ""}`}>
			<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
				<Dices className="size-4" />
			</div>
			<div className="flex flex-col gap-0.5 leading-none">
				<span className="font-bold font-lg text-foreground">rpthing</span>
			</div>
		</div>
	);
}
