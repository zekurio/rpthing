// Bun S3 client implementation
import { S3Client } from "bun";
import { env } from "@/env";

const accessKeyId = env.S3_ACCESS_KEY_ID;
const secretAccessKey = env.S3_SECRET_ACCESS_KEY;
const bucket = env.S3_BUCKET_NAME;
const endpoint = env.S3_ENDPOINT;
const region = "us-east-1";
const publicEndpoint = env.PUBLIC_S3_ENDPOINT;

// Public endpoint is already normalized by env.ts
const normalizedPublicBaseUrl = publicEndpoint;

const s3 = new S3Client({
	accessKeyId,
	secretAccessKey,
	bucket,
	endpoint,
	region,
});

/**
 * Normalize relative path (no leading slash, no double slashes).
 */
const normalizePath = (targetPath: string): string =>
	targetPath.replace(/^\/+/, "").replace(/\/+/g, "/");

/**
 * Converts ArrayBuffer or Uint8Array into Uint8Array.
 */
const toUint8Array = (data: ArrayBuffer | Uint8Array): Uint8Array => {
	if (data instanceof Uint8Array) return data;
	if (data instanceof ArrayBuffer) return new Uint8Array(data);
	throw new TypeError("uploadFile() only supports ArrayBuffer or Uint8Array.");
};

/**
 * Upload file content to S3.
 */
export const uploadFile = async (
	targetPath: string,
	data: ArrayBuffer | Uint8Array,
	options?: { contentType?: string; cacheControl?: string },
): Promise<number> => {
	const objectKey = normalizePath(targetPath);
	const bytes = toUint8Array(data);

	try {
		await s3.write(objectKey, bytes, {
			type: options?.contentType,
			...(options?.cacheControl && { cacheControl: options.cacheControl }),
		});
		return bytes.byteLength;
	} catch (cause) {
		throw new Error(`Upload failed for "${targetPath}"`, { cause });
	}
};

/**
 * Delete a file from S3.
 */
export const deleteFile = async (targetPath: string): Promise<boolean> => {
	const objectKey = normalizePath(targetPath);

	try {
		await s3.delete(objectKey);
		return true;
	} catch (cause) {
		throw new Error(`Delete failed for "${targetPath}"`, { cause });
	}
};

/**
 * Generate a presigned public URL for a file.
 */
export const getFileUrl = async (
	targetPath: string,
	opts?: { expiresIn?: number },
): Promise<string> => {
	const objectKey = normalizePath(targetPath);

	try {
		const expiresIn = Math.max(1, Math.floor(opts?.expiresIn ?? 60 * 60 * 24));
		const url = s3.file(objectKey).presign({ expiresIn });
		return url;
	} catch (cause) {
		throw new Error(`URL generation failed for "${targetPath}"`, { cause });
	}
};

/**
 * Generate a public URL for a file (no expiration, no query parameters).
 * This is suitable for frequently accessed images that don't need temporary access.
 */
export const getPublicFileUrl = (targetPath: string): string => {
	const objectKey = normalizePath(targetPath);

	// Priority: use public endpoint if available
	if (normalizedPublicBaseUrl) {
		return `${normalizedPublicBaseUrl}/${objectKey}`;
	}

	// Fallback: use configured endpoint if available
	if (endpoint) {
		const hasBucketInUrl = endpoint.includes(bucket);
		return hasBucketInUrl
			? `${endpoint}/${objectKey}`
			: `${endpoint}/${bucket}/${objectKey}`;
	}

	// Last resort: standard AWS S3 public URL
	return `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
};

/**
 * Check whether a file exists in S3.
 */
export const existsFile = async (targetPath: string): Promise<boolean> => {
	const objectKey = normalizePath(targetPath);

	try {
		await s3.stat(objectKey);
		return true;
	} catch (_err) {
		return false;
	}
};

export const storage = {
	uploadFile,
	deleteFile,
	getFileUrl,
	getPublicFileUrl,
	existsFile,
};
