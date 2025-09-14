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
	data: ArrayBuffer | Uint8Array,
): Promise<Uint8Array> => {
	if (data instanceof Uint8Array) return data;
	if (data instanceof ArrayBuffer) return new Uint8Array(data);
	throw new Error("Unsupported data type for upload");
};

/**
 * Uploads a file to storage
 * @param path - The path to the file
 * @param data - The file data to upload
 * @returns The number of bytes written
 * @throws Error if upload fails
 */
export const uploadFile = async (
	targetPath: string,
	data: ArrayBuffer | Uint8Array,
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
 * Deletes a file from storage
 * @param path - The path to the file
 * @returns True if deletion succeeded
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
 * Gets a public URL for a file in storage
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
