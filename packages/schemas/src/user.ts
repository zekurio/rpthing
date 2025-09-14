import { z } from "zod";

export const displayName = z
	.string()
	.trim()
	.min(2)
	.max(64)
	.regex(/^[\p{L}\p{N} .,'-]+$/u);

export const updateProfileInput = z.object({
	name: displayName,
});
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

