import sharp from "sharp";

/**
 * Supported image MIME types and their extensions
 */
export const SUPPORTED_IMAGE_TYPES = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
	"image/avif": "avif",
} as const;

export type SupportedMimeType = keyof typeof SUPPORTED_IMAGE_TYPES;

/**
 * Get file extension from MIME type
 */
export function extensionFromMime(mime: string): string {
	return SUPPORTED_IMAGE_TYPES[mime as SupportedMimeType] ?? "";
}

/**
 * Get MIME type from extension
 */
export function mimeFromExtension(ext: string): string {
	const lower = ext.toLowerCase();
	switch (lower) {
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		case "png":
			return "image/png";
		case "webp":
			return "image/webp";
		case "avif":
			return "image/avif";
		default:
			return "image/png";
	}
}

/**
 * Check if a MIME type is a supported image type
 */
export function isSupportedImageType(mime: string): boolean {
	return mime.startsWith("image/") && mime !== "image/gif";
}

/**
 * Extract extension from filename
 */
export function extractExtensionFromFilename(filename: string): string {
	const idx = filename.lastIndexOf(".");
	return idx >= 0 ? filename.slice(idx + 1).toLowerCase() : "";
}

/**
 * Determine the best extension for an uploaded file
 */
export function determineExtension(mime: string, filename: string): string {
	const extFromMime = extensionFromMime(mime);
	const extFromName = extractExtensionFromFilename(filename);
	return (extFromMime || extFromName || "bin").toLowerCase();
}

/**
 * Crop definition using percentages
 */
export interface PercentCrop {
	unit?: string;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
}

/**
 * Result of processing a cropped image
 */
export interface CroppedImageResult {
	buffer: Uint8Array;
	extension: string;
	mimeType: string;
}

/**
 * Validate that a crop object has all required percentage values
 */
export function isValidPercentCrop(crop: PercentCrop): boolean {
	return (
		crop.unit === "%" &&
		typeof crop.x === "number" &&
		typeof crop.y === "number" &&
		typeof crop.width === "number" &&
		typeof crop.height === "number"
	);
}

/**
 * Parse crop JSON from form data
 */
export function parseCropJson(cropJson: string): PercentCrop | null {
	try {
		const crop = JSON.parse(cropJson) as PercentCrop;
		if (crop && isValidPercentCrop(crop)) {
			return crop;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Process an image with cropping using sharp
 */
export async function cropImage(
	imageBuffer: Uint8Array,
	crop: PercentCrop,
	originalExtension: string,
): Promise<CroppedImageResult | null> {
	try {
		const base = sharp(imageBuffer);
		const meta = await base.metadata();
		const srcWidth = meta.width ?? 0;
		const srcHeight = meta.height ?? 0;

		if (srcWidth <= 0 || srcHeight <= 0) {
			return null;
		}

		// Calculate pixel coordinates from percentages
		const left = Math.max(0, Math.round(((crop.x ?? 0) / 100) * srcWidth));
		const top = Math.max(0, Math.round(((crop.y ?? 0) / 100) * srcHeight));
		const width = Math.max(
			1,
			Math.round(((crop.width ?? 100) / 100) * srcWidth),
		);
		const height = Math.max(
			1,
			Math.round(((crop.height ?? 100) / 100) * srcHeight),
		);

		// Ensure bounds don't exceed image dimensions
		const boundedLeft = Math.min(left, Math.max(0, srcWidth - 1));
		const boundedTop = Math.min(top, Math.max(0, srcHeight - 1));
		const boundedWidth = Math.min(width, srcWidth - boundedLeft);
		const boundedHeight = Math.min(height, srcHeight - boundedTop);

		const pipeline = base.extract({
			left: boundedLeft,
			top: boundedTop,
			width: boundedWidth,
			height: boundedHeight,
		});

		// Encode to the appropriate format
		let croppedBuffer: Uint8Array;
		let finalExtension = originalExtension.toLowerCase();

		switch (finalExtension) {
			case "jpg":
			case "jpeg":
				croppedBuffer = await pipeline.jpeg({ quality: 90 }).toBuffer();
				finalExtension = "jpg";
				break;
			case "png":
				croppedBuffer = await pipeline.png().toBuffer();
				break;
			case "webp":
				croppedBuffer = await pipeline.webp({ quality: 90 }).toBuffer();
				break;
			case "avif":
				croppedBuffer = await pipeline.avif({ quality: 80 }).toBuffer();
				break;
			default:
				// Default to PNG for unknown formats
				croppedBuffer = await pipeline.png().toBuffer();
				finalExtension = "png";
		}

		return {
			buffer: croppedBuffer,
			extension: finalExtension,
			mimeType: mimeFromExtension(finalExtension),
		};
	} catch (error) {
		console.error("Failed to crop image:", error);
		return null;
	}
}

/**
 * Unsupported image type response helper
 */
export const unsupportedImageResponse = () =>
	Response.json(
		{ error: "Only non-GIF image uploads are allowed" },
		{ status: 415 },
	);
