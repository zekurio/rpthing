import type { NextConfig } from "next";

// Build remote image patterns, guarding against empty hostnames
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
	{ protocol: "https", hostname: "cdn.discordapp.com" },
];

const rawS3Endpoint = process.env.PUBLIC_S3_ENDPOINT?.trim();
if (rawS3Endpoint) {
	let s3Hostname = rawS3Endpoint;
	try {
		// Support either a bare hostname or a full URL
		if (rawS3Endpoint.includes("://")) {
			s3Hostname = new URL(rawS3Endpoint).hostname;
		}
		if (s3Hostname) {
			remotePatterns.push({ protocol: "https", hostname: s3Hostname });
		}
	} catch {
		// Ignore malformed value; do not add to remotePatterns
	}
}

const nextConfig: NextConfig = {
	typedRoutes: true,
	images: {
		remotePatterns,
	},
};

export default nextConfig;
