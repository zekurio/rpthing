import { S3Client } from "bun";

//
// --- Environment Validation ---
//
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const bucketName = process.env.S3_BUCKET_NAME;
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION || "us-east-1";

if (!accessKeyId || !secretAccessKey || !bucketName) {
	throw new Error(
		"Missing required S3 environment variables: " +
			"S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME",
	);
}

//
// --- S3 Client ---
//
const s3Client = new S3Client({
	accessKeyId,
	secretAccessKey,
	region,
	endpoint,
});

//
// --- Helpers ---
//
const endpointIncludesBucket = endpoint?.includes(bucketName) ?? false;

/**
 * Normalize relative path (no leading slash, no double slashes).
 */
const normalizePath = (targetPath: string): string =>
	targetPath.replace(/^\/+/, "").replace(/\/+/g, "/");

/**
 * Resolves the actual storage path depending on endpoint style.
 */
const resolvePath = (targetPath: string): string => {
	const normalized = normalizePath(targetPath);
	return endpointIncludesBucket ? normalized : `${bucketName}/${normalized}`;
};

/**
 * Converts ArrayBuffer or Uint8Array into Uint8Array.
 */
const toUint8Array = (data: ArrayBuffer | Uint8Array): Uint8Array => {
	if (data instanceof Uint8Array) return data;
	if (data instanceof ArrayBuffer) return new Uint8Array(data);
	throw new TypeError("uploadFile() only supports ArrayBuffer or Uint8Array.");
};

//
// --- Core API ---
//

/**
 * Upload file content to S3.
 */
export const uploadFile = async (
	targetPath: string,
	data: ArrayBuffer | Uint8Array,
): Promise<number> => {
	const fullPath = resolvePath(targetPath);
	const bytes = toUint8Array(data);

	try {
		const file = s3Client.file(fullPath);
		await file.write(bytes);
		return bytes.byteLength;
	} catch (cause) {
		throw new Error(`Upload failed for "${targetPath}"`, { cause });
	}
};

/**
 * Delete a file from S3.
 */
export const deleteFile = async (targetPath: string): Promise<boolean> => {
	const fullPath = resolvePath(targetPath);

	try {
		const file = s3Client.file(fullPath);
		await file.delete();
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
	const fullPath = resolvePath(targetPath);

	try {
		const file = s3Client.file(fullPath);
		return file.presign({
			acl: "public-read",
			expiresIn: opts?.expiresIn ?? 60 * 60 * 24, // 1 day
		});
	} catch (cause) {
		throw new Error(`URL generation failed for "${targetPath}"`, { cause });
	}
};

/**
 * Check whether a file exists in S3.
 */
export const existsFile = async (targetPath: string): Promise<boolean> => {
	const fullPath = resolvePath(targetPath);

	try {
		const file = s3Client.file(fullPath);
		const stat = await file.stat(); // Bun S3 returns metadata if exists
		return stat !== null;
	} catch {
		// Explicitly return false when object not found
		return false;
	}
};
