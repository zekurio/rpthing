import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = process.env.STORAGE_PATH || "apps/server/storage";

const ensureDirectory = async (dirPath: string) => {
	await mkdir(dirPath, { recursive: true });
};

const normalizeAndResolve = (targetPath: string): string => {
	const withoutLeadingSlash = targetPath.replace(/^\/+/, "");
	const normalized = path.normalize(withoutLeadingSlash);
	const resolved = path.resolve(STORAGE_ROOT, normalized);
	const rootResolved = path.resolve(STORAGE_ROOT);
	if (
		!resolved.startsWith(rootResolved + path.sep) &&
		resolved !== rootResolved
	) {
		throw new Error("Attempted path traversal outside of storage root");
	}
	return resolved;
};

const toUint8Array = async (
	data:
		| string
		| ArrayBuffer
		| SharedArrayBuffer
		| Blob
		| Response
		| Request
		| Uint8Array,
): Promise<Uint8Array> => {
	if (typeof data === "string") return new TextEncoder().encode(data);
	if (data instanceof Uint8Array) return data;
	if (data instanceof ArrayBuffer || data instanceof SharedArrayBuffer)
		return new Uint8Array(data as ArrayBuffer);
	if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
	if (data instanceof Response) return new Uint8Array(await data.arrayBuffer());
	if (data instanceof Request)
		return new Uint8Array(await (await data.blob()).arrayBuffer());
	throw new Error("Unsupported data type for upload");
};

/**
 * Uploads a file to the S3 bucket
 * @param path - The path to the file
 * @param file - The file to upload
 * @returns The number of bytes written
 * @throws Error if upload fails
 */
export const uploadFile = async (
	targetPath: string,
	data:
		| string
		| ArrayBuffer
		| SharedArrayBuffer
		| Blob
		| Response
		| Request
		| Uint8Array,
	_contentType?: string,
): Promise<number> => {
	try {
		const absolutePath = normalizeAndResolve(targetPath);
		await ensureDirectory(path.dirname(absolutePath));
		const bytes = await toUint8Array(data);
		await writeFile(absolutePath, bytes);
		return bytes.byteLength;
	} catch (error) {
		throw new Error(
			`Failed to upload file to ${targetPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};

/**
 * Deletes a file from the S3 bucket
 * @param path - The path to the file
 * @returns The response from the S3 bucket
 * @throws Error if deletion fails
 */
export const deleteFile = async (targetPath: string) => {
	try {
		const absolutePath = normalizeAndResolve(targetPath);
		await rm(absolutePath, { force: true });
		return true;
	} catch (error) {
		throw new Error(
			`Failed to delete file at ${targetPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};

/**
 * Gets a public URL for a file in the S3 bucket
 * @param path - The path to the file
 * @returns The public URL to access the file
 * @throws Error if URL generation fails
 */
export const getFileUrl = async (targetPath: string): Promise<string> => {
	try {
		const withoutLeadingSlash = targetPath.replace(/^\/+/, "");
		return `/${withoutLeadingSlash}`;
	} catch (error) {
		throw new Error(
			`Failed to get URL for file at ${targetPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};
