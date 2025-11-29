import type * as nsfwjs from "nsfwjs";
import sharp from "sharp";

// NSFW class names that indicate explicit content
const NSFW_CLASSES = ["Porn", "Hentai", "Sexy"];

// Confidence threshold for considering an image NSFW
const NSFW_THRESHOLD = 0.5;

// Model singleton
let modelInstance: nsfwjs.NSFWJS | null = null;
let modelLoadPromise: Promise<nsfwjs.NSFWJS> | null = null;

/**
 * Load the NSFW.js model (singleton pattern)
 * Uses MobileNetV2 which is lighter and faster than InceptionV3
 */
async function loadModel(): Promise<nsfwjs.NSFWJS> {
	if (modelInstance) {
		return modelInstance;
	}

	if (modelLoadPromise) {
		return modelLoadPromise;
	}

	modelLoadPromise = (async () => {
		// Dynamic import to avoid bundling issues
		const nsfwModule = await import("nsfwjs");
		// Load the default model (MobileNetV2 mid)
		// This runs on the server so we don't have browser constraints
		const model = await nsfwModule.load();
		modelInstance = model;
		return model;
	})();

	return modelLoadPromise;
}

/**
 * Convert image buffer to a format suitable for NSFW.js classification
 * NSFW.js expects an HTMLImageElement or tf.Tensor3D
 * On server-side, we'll convert to a raw pixel tensor
 */
async function prepareImageForClassification(imageBuffer: Uint8Array): Promise<{
	data: Uint8Array;
	width: number;
	height: number;
}> {
	// Use sharp to decode the image and convert to raw RGB pixels
	// Resize to 224x224 which is what MobileNetV2 expects
	const { data, info } = await sharp(imageBuffer)
		.resize(224, 224, {
			fit: "cover",
			position: "center",
		})
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	return {
		data: new Uint8Array(data),
		width: info.width,
		height: info.height,
	};
}

/**
 * Create a tensor from raw image data for NSFW.js
 */
async function createImageTensor(imageBuffer: Uint8Array) {
	const tf = await import("@tensorflow/tfjs");
	const { data, width, height } =
		await prepareImageForClassification(imageBuffer);

	// Create a 3D tensor from the raw RGB data
	// Shape: [height, width, channels]
	const tensor = tf.tensor3d(data, [height, width, 3], "int32");

	return tensor;
}

export interface NsfwClassificationResult {
	isNsfw: boolean;
	confidence: number;
	topClass: string;
	allPredictions: Array<{
		className: string;
		probability: number;
	}>;
}

interface NsfwPrediction {
	className: string;
	probability: number;
}

/**
 * Classify an image buffer for NSFW content
 * @param imageBuffer - The raw image buffer (supports PNG, JPEG, WebP, AVIF)
 * @returns Classification result with isNsfw boolean and confidence score
 */
export async function classifyImage(
	imageBuffer: Uint8Array,
): Promise<NsfwClassificationResult> {
	try {
		const model = await loadModel();
		const tensor = await createImageTensor(imageBuffer);

		try {
			// Classify the image
			const predictions = (await model.classify(
				tensor as unknown as HTMLImageElement,
			)) as NsfwPrediction[];

			// Find the top prediction
			const topPrediction = predictions.reduce(
				(max: NsfwPrediction, pred: NsfwPrediction) =>
					pred.probability > max.probability ? pred : max,
			);

			// Check if the top prediction is an NSFW class with sufficient confidence
			const isNsfw =
				NSFW_CLASSES.includes(topPrediction.className) &&
				topPrediction.probability >= NSFW_THRESHOLD;

			return {
				isNsfw,
				confidence: topPrediction.probability,
				topClass: topPrediction.className,
				allPredictions: predictions.map((p: NsfwPrediction) => ({
					className: p.className,
					probability: p.probability,
				})),
			};
		} finally {
			// Clean up tensor to prevent memory leaks
			const tf = await import("@tensorflow/tfjs");
			tf.dispose(tensor);
		}
	} catch (error) {
		console.error("NSFW classification failed:", error);
		// Default to not NSFW on error to avoid false positives
		return {
			isNsfw: false,
			confidence: 0,
			topClass: "error",
			allPredictions: [],
		};
	}
}

/**
 * Classify an image from a URL
 * Fetches the image and classifies it
 */
export async function classifyImageFromUrl(
	imageUrl: string,
): Promise<NsfwClassificationResult> {
	try {
		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`);
		}
		const arrayBuffer = await response.arrayBuffer();
		return classifyImage(new Uint8Array(arrayBuffer));
	} catch (error) {
		console.error("Failed to classify image from URL:", error);
		return {
			isNsfw: false,
			confidence: 0,
			topClass: "error",
			allPredictions: [],
		};
	}
}

/**
 * Preload the NSFW model
 * Call this during server startup to avoid cold start delays
 */
export async function preloadNsfwModel(): Promise<void> {
	await loadModel();
}
