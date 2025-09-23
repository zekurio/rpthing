"use client";

import type { User } from "better-auth";
import { useCallback, useMemo } from "react";
import { authClient } from "@/lib/auth-client";

type SignInProvider = "discord";

export function useAuth() {
	const { data: session, isPending, error, refetch } = authClient.useSession();

	const user = session?.user as User | undefined;

	const signOut = useCallback(async () => {
		await authClient.signOut();
		refetch();
	}, [refetch]);

	const signInWithProvider = useCallback(
		async (provider: SignInProvider, callbackURL?: string) => {
			await authClient.signIn.social({ provider, callbackURL });
		},
		[],
	);

	const updateProfile = useCallback(
		async (updates: Partial<Pick<User, "name" | "image">>) => {
			await authClient.updateUser(updates);
			refetch();
		},
		[refetch],
	);

	const deleteAccount = useCallback(async () => {
		await authClient.deleteUser();
		refetch();
	}, [refetch]);

	return useMemo(
		() => ({
			session,
			user,
			isLoading: isPending,
			error,
			signOut,
			signInWithProvider,
			updateProfile,
			deleteAccount,
			refetch,
		}),
		[
			session,
			user,
			isPending,
			error,
			signOut,
			signInWithProvider,
			updateProfile,
			deleteAccount,
			refetch,
		],
	);
}
