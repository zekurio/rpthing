// AWS SDK v3 S3 client implementation
import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

//
// --- Environment Validation ---
//
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const bucketName = process.env.S3_BUCKET_NAME;
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION || "us-east-1";
const publicEndpoint = process.env.PUBLIC_S3_ENDPOINT;

if (!accessKeyId || !secretAccessKey || !bucketName) {
	throw new Error(
		"Missing required S3 environment variables: " +
			"S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME",
	);
}

//
// --- S3 Client ---
//
const forcePathStyle = (() => {
	const env = process.env.S3_FORCE_PATH_STYLE;
	if (env === "true") return true;
	if (env === "false") return false;
	// Default: force path style when a custom endpoint is provided
	return Boolean(endpoint);
})();

const s3 = new S3Client({
	region,
	endpoint,
	forcePathStyle,
	credentials: {
		accessKeyId: accessKeyId!,
		secretAccessKey: secretAccessKey!,
	},
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
	contentType?: string,
): Promise<number> => {
	const objectKey = normalizePath(targetPath);
	const bytes = toUint8Array(data);

	// First try with public-read ACL; if the backend doesn't support ACLs, retry without
	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: bucketName!,
				Key: objectKey,
				Body: bytes,
				ACL: "public-read",
				ContentType: contentType,
			}),
		);
		return bytes.byteLength;
	} catch (firstError) {
		try {
			await s3.send(
				new PutObjectCommand({
					Bucket: bucketName!,
					Key: objectKey,
					Body: bytes,
					ContentType: contentType,
				}),
			);
			return bytes.byteLength;
		} catch (cause) {
			throw new Error(`Upload failed for "${targetPath}"`, { cause });
		}
	}
};

/**
 * Delete a file from S3.
 */
export const deleteFile = async (targetPath: string): Promise<boolean> => {
	const objectKey = normalizePath(targetPath);

	try {
		await s3.send(
			new DeleteObjectCommand({ Bucket: bucketName!, Key: objectKey }),
		);
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
		const cmd = new GetObjectCommand({ Bucket: bucketName!, Key: objectKey });
		const expiresIn = Math.max(1, Math.floor(opts?.expiresIn ?? 60 * 60 * 24));
		return await getSignedUrl(s3, cmd, { expiresIn });
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
	const baseUrl = publicEndpoint ?? endpoint;
	if (baseUrl) {
		// If the provided base URL already contains the bucket name, don't add it again
		const hasBucketInUrl = baseUrl.includes(bucketName!);
		return hasBucketInUrl
			? `${baseUrl}/${objectKey}`
			: `${baseUrl}/${bucketName}/${objectKey}`;
	}
	// Fallback to standard AWS S3 public URL
	return `https://${bucketName}.s3.${region}.amazonaws.com/${objectKey}`;
};

/**
 * Check whether a file exists in S3.
 */
export const existsFile = async (targetPath: string): Promise<boolean> => {
	const objectKey = normalizePath(targetPath);

	try {
		await s3.send(new HeadObjectCommand({ Bucket: bucketName!, Key: objectKey }));
		return true;
	} catch (err) {
		// NotFound or 404 -> false; other errors also treated as not existing
		return false;
	}
};
