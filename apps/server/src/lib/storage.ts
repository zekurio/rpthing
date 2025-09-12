import { S3Client } from "bun";

// Centralized S3 client initialized from environment variables
// Supported providers: AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, etc.
// Required: S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
// Optional: S3_ENDPOINT, S3_REGION, S3_VIRTUAL_HOSTED_STYLE ("true"/"false")

const bucket = process.env.S3_BUCKET || "";
const accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
const endpoint = process.env.S3_ENDPOINT || undefined;
const region = process.env.S3_REGION || undefined;
const virtualHostedStyle =
	(process.env.S3_VIRTUAL_HOSTED_STYLE || "false").toLowerCase() === "true";

if (!bucket || !accessKeyId || !secretAccessKey) {
	// Defer throwing until methods are used, but log a clear startup warning
	console.warn(
		"[storage] Missing S3 configuration. Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.",
	);
}

const client = new S3Client({
	accessKeyId,
	secretAccessKey,
	bucket,
	endpoint,
	region,
	virtualHostedStyle,
});

function ensureConfigured() {
	if (!bucket || !accessKeyId || !secretAccessKey) {
		throw new Error(
			"S3 is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.",
		);
	}
}

export type StorageWriteInput =
	| string
	| Uint8Array
	| ArrayBuffer
	| Blob
	| Response
	| Request;

export const storage = {
	client,

	// Return a lazy reference to a file in the bucket
	file(key: string) {
		ensureConfigured();
		return client.file(key);
	},

	// Upload/overwrite the object
	async write(key: string, data: StorageWriteInput, options?: BlobPropertyBag) {
		ensureConfigured();
		return client.file(key).write(data, options);
	},

	// Read object as text
	async readText(key: string) {
		ensureConfigured();
		return client.file(key).text();
	},

	// Read object as JSON
	async readJSON<T = unknown>(key: string): Promise<T> {
		ensureConfigured();
		return client.file(key).json() as Promise<T>;
	},

	// Check if object exists
	async exists(key: string) {
		ensureConfigured();
		return client.file(key).exists();
	},

	// Delete object
	async delete(key: string) {
		ensureConfigured();
		return client.file(key).delete();
	},

	// Generate a presigned URL
	presign(
		key: string,
		opts?: {
			expiresIn?: number; // seconds
			method?: "GET" | "PUT" | "POST" | "DELETE" | "HEAD";
			type?: string;
			acl?:
				| "private"
				| "public-read"
				| "public-read-write"
				| "authenticated-read"
				| "aws-exec-read"
				| "bucket-owner-read"
				| "bucket-owner-full-control"
				| "log-delivery-write";
		},
	) {
		ensureConfigured();
		return client.file(key).presign(opts);
	},

	// List objects (up to 1000). Supports prefix/pagination.
	async list(params?: {
		prefix?: string; // do not allow null per Bun typing
		maxKeys?: number;
		startAfter?: string;
		fetchOwner?: boolean;
	}) {
		ensureConfigured();
		return S3Client.list(params ?? null, {
			accessKeyId,
			secretAccessKey,
			bucket,
			endpoint,
			region,
		});
	},
};

export type Storage = typeof storage;
