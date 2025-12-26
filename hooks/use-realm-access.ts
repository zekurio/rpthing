import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { realmQueries } from "@/lib/eden";
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
		...realmQueries.byId(realmId ?? ""),
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
 * Note: Auth protection is now handled by middleware
 */
export function useAuthGuard() {
	const { user, isLoading } = useAuth();

	return {
		user,
		isLoading,
	};
}
