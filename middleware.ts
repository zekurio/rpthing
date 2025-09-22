import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Temporarily disable middleware-based auth checks
// Better-auth works better with client-side authentication checks
// The useAuthGuard and useRealmAccess hooks will handle redirects

export function middleware(_request: NextRequest) {
	// For now, just pass through all requests
	// Authentication is handled by client-side hooks
	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico).*)",
	],
};
