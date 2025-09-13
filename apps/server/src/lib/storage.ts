import { S3Client, type S3File } from "bun";

export const s3 = new S3Client({
	accessKeyId: process.env.S3_ACCESS_KEY_ID,
	secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
	bucket: process.env.S3_BUCKET,
});

/**
 * Uploads a file to the S3 bucket
 * @param path - The path to the file
 * @param file - The file to upload
 * @returns The number of bytes written
 * @throws Error if upload fails
 */
export const uploadFile = async (
	path: string,
	file: S3File,
): Promise<number> => {
	try {
		const response = await s3.write(path, file);
		return response;
	} catch (error) {
		throw new Error(
			`Failed to upload file to ${path}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};

/**
 * Deletes a file from the S3 bucket
 * @param path - The path to the file
 * @returns The response from the S3 bucket
 * @throws Error if deletion fails
 */
export const deleteFile = async (path: string) => {
	try {
		const response = await s3.delete(path);
		return response;
	} catch (error) {
		throw new Error(
			`Failed to delete file at ${path}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};

/**
 * Gets a public URL for a file in the S3 bucket
 * @param path - The path to the file
 * @returns The public URL to access the file
 * @throws Error if URL generation fails
 */
export const getFileUrl = async (path: string): Promise<string> => {
	try {
		const url = await s3.file(path).presign();
		return url;
	} catch (error) {
		throw new Error(
			`Failed to get URL for file at ${path}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};
