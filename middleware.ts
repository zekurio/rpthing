import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";

export async function middleware(request: NextRequest) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const pathname = request.nextUrl.pathname;

	// Handle root route: redirect to /realms if authenticated, otherwise to /login
	if (pathname === "/") {
		if (session) {
			return NextResponse.redirect(new URL("/realms", request.url));
		}
		return NextResponse.redirect(new URL("/login", request.url));
	}

	// Protect /realms route - redirect to /login if not authenticated
	if (pathname === "/realms" && !session) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	return NextResponse.next();
}

export const config = {
	runtime: "nodejs",
	matcher: ["/", "/realms"], // Apply middleware to root and /realms routes
};
