"use client";

import { useEffect } from "react";
import { queryClient, trpc } from "@/utils/trpc";

type RealtimeEvent =
	| { type: "realm.updated"; realmId: string }
	| { type: "realm.deleted"; realmId: string }
	| { type: "trait.created" | "trait.updated" | "trait.deleted"; realmId: string }
	| {
			type:
				| "character.created"
				| "character.updated"
				| "character.deleted"
				| "character.image.updated"
				| "character.image.deleted";
			realmId: string;
			characterId?: string;
		}
	| {
			type: "rating.updated" | "rating.deleted";
			realmId: string;
			characterId: string;
		};

export function useRealtime(realmId: string | null | undefined) {
	useEffect(() => {
		if (!realmId) return;
		const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/events/${realmId}`;
		const es = new EventSource(url, { withCredentials: true });

		const invalidate = (evt: RealtimeEvent) => {
			// Scope invalidations to specific queries to avoid broad refetches
			switch (evt.type) {
				case "realm.updated": {
					queryClient.invalidateQueries({
						queryKey: trpc.realm.getById.queryKey({ realmId: evt.realmId }),
					});
					break;
				}
				case "realm.deleted": {
					queryClient.invalidateQueries({
						queryKey: trpc.realm.list.queryKey(),
					});
					break;
				}
				case "trait.created":
				case "trait.updated":
				case "trait.deleted": {
					queryClient.invalidateQueries({
						queryKey: trpc.trait.list.queryKey({ realmId: evt.realmId }),
					});
					break;
				}
				case "character.created":
				case "character.deleted": {
					queryClient.invalidateQueries({
						queryKey: trpc.character.list.queryKey({ realmId: evt.realmId }),
					});
					break;
				}
				case "character.updated": {
					if (evt.characterId) {
						queryClient.invalidateQueries({
							queryKey: trpc.character.getById.queryKey({ id: evt.characterId }),
						});
					}
					queryClient.invalidateQueries({
						queryKey: trpc.character.list.queryKey({ realmId: evt.realmId }),
					});
					break;
				}
				case "character.image.updated":
				case "character.image.deleted": {
					if (evt.characterId) {
						queryClient.invalidateQueries({
							queryKey: trpc.character.getById.queryKey({ id: evt.characterId }),
						});
					}
					queryClient.invalidateQueries({
						queryKey: trpc.character.list.queryKey({ realmId: evt.realmId }),
					});
					break;
				}
				case "rating.updated":
				case "rating.deleted": {
					if (evt.characterId) {
						queryClient.invalidateQueries({
							queryKey: trpc.character.ratings.listByCharacter.queryKey({
								characterId: evt.characterId,
							}),
						});
						queryClient.invalidateQueries({
							queryKey: trpc.character.getWithRatings.queryKey({
								id: evt.characterId,
							}),
						});
					}
					break;
				}
			}
		};

		es.onmessage = (e) => {
			try {
				const data = JSON.parse(e.data) as RealtimeEvent;
				invalidate(data);
			} catch {}
		};

		return () => {
			es.close();
		};
	}, [realmId]);
}

