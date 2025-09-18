import { EventEmitter } from "node:events";

export type RealtimeEvent =
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

export const eventBus = new EventEmitter();

export function publish(event: RealtimeEvent) {
	eventBus.emit("event", event);
}

