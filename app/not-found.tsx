import { Home, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<div className="space-y-6 text-left">
				<div className="space-y-2">
					<h1 className="font-bold text-6xl text-muted-foreground">404</h1>
					<h2 className="font-semibold text-2xl">Page Not Found</h2>
					<p className="text-muted-foreground">
						The page you're looking for doesn't exist.
					</p>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<Button asChild variant="default">
						<Link href="/" className="flex items-center gap-2">
							<Home className="h-4 w-4" />
							Go Home
						</Link>
					</Button>

					<Button asChild variant="outline">
						<Link href="/characters" className="flex items-center gap-2">
							<Users className="h-4 w-4" />
							Go to Characters
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
