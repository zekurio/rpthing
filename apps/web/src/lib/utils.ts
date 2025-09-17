import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function s3UrlFromKey(key?: string | null): string | null {
	// No longer needed; server presigns like realms. Keep as stub for safety.
	return key ?? null;
}
