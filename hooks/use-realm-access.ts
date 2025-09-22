import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trpc } from "@/utils/trpc";
import { useAuth } from "./use-auth";

/**
 * Hook to check realm access and indicate if not-found should be shown
 * Returns realm data if access is granted, indicates not-found should be shown if not
 */
export function useRealmAccess(realmId: string | null | undefined) {
	const _router = useRouter();
	const [shouldShowNotFound, setShouldShowNotFound] = useState(false);

	const {
		data: realm,
		isLoading,
		error,
	} = useQuery({
		...trpc.realm.getById.queryOptions({ realmId: realmId ?? "" }),
		enabled: Boolean(realmId),
		retry: false, // Don't retry on authorization errors
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (error && !isLoading) {
			// Show not-found page for any access issues
			setShouldShowNotFound(true);
		}
	}, [error, isLoading]);

	return {
		realm,
		isLoading,
		hasAccess: !error && !isLoading,
		shouldShowNotFound,
	};
}

/**
 * Hook to check if user is authenticated
 * Redirects to login if not authenticated
 */
export function useAuthGuard() {
	const router = useRouter();
	const { user, isLoading, isAuthenticated } = useAuth();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			// Redirect to login if not authenticated
			const currentPath = window.location.pathname;
			router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
		}
	}, [isLoading, isAuthenticated, router]);

	return {
		user,
		isLoading,
		isAuthenticated,
	};
}
