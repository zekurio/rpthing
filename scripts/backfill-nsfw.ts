/**
 * Backfill NSFW classification for existing character images
 *
 * This script fetches all characters with images and runs NSFW detection on them,
 * updating the database with the results. It processes all characters with images
 * regardless of their current isNsfw value.
 *
 * Usage: bun run scripts/backfill-nsfw.ts
 */

import "dotenv/config";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/server/db/index";
import { character } from "@/server/db/schema/character";
import { classifyImageFromUrl } from "@/server/nsfw-classification";
import { getPublicFileUrl } from "@/server/storage";

async function backfillNsfwClassifications() {
	console.log("Starting NSFW backfill process...");

	// Get all characters with images
	const characters = await db
		.select({
			id: character.id,
			name: character.name,
			referenceImageKey: character.referenceImageKey,
			isNsfw: character.isNsfw,
		})
		.from(character)
		.where(isNotNull(character.referenceImageKey));

	console.log(`Found ${characters.length} characters with images to classify`);

	if (characters.length === 0) {
		console.log("No characters with images found. Exiting.");
		return;
	}

	let processed = 0;
	let nsfwCount = 0;
	let errors = 0;

	for (const char of characters) {
		try {
			const imageUrl = getPublicFileUrl(char.referenceImageKey as string);
			console.log(
				`[${processed + 1}/${characters.length}] Classifying: ${char.name} (${char.id})`,
			);

			const result = await classifyImageFromUrl(imageUrl);

			await db
				.update(character)
				.set({ isNsfw: result.isNsfw })
				.where(eq(character.id, char.id));

			if (result.isNsfw) {
				nsfwCount++;
				console.log(
					`  → NSFW detected: ${result.topClass} (${(result.confidence * 100).toFixed(1)}%)`,
				);
			} else {
				console.log(
					`  → Safe: ${result.topClass} (${(result.confidence * 100).toFixed(1)}%)`,
				);
			}

			processed++;
		} catch (error) {
			console.error(`  → Error processing ${char.name}:`, error);
			errors++;
		}

		// Small delay to avoid overwhelming the system
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	console.log("\n=== Backfill Complete ===");
	console.log(`Total processed: ${processed}`);
	console.log(`NSFW detected: ${nsfwCount}`);
	console.log(`Errors: ${errors}`);
}

// Run the backfill
backfillNsfwClassifications()
	.then(() => {
		console.log("Done!");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
