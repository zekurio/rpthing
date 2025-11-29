import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";

export async function middleware(request: NextRequest) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const pathname = request.nextUrl.pathname;

	// Handle root route: redirect to /characters if authenticated, otherwise to /login
	if (pathname === "/") {
		if (session) {
			return NextResponse.redirect(new URL("/characters", request.url));
		}
		return NextResponse.redirect(new URL("/login", request.url));
	}

	// Protect /characters route - redirect to /login if not authenticated
	if (pathname === "/characters" && !session) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	return NextResponse.next();
}

export const config = {
	runtime: "nodejs",
	matcher: ["/", "/characters"], // Apply middleware to root, /characters, and /realms routes
};
