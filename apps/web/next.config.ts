import type { NextConfig } from "next";

// Build remote image patterns: allow Discord CDN plus optional PUBLIC_S3_ENDPOINT hostname
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
	{ protocol: "https", hostname: "cdn.discordapp.com" },
];

const s3Hostname = process.env.PUBLIC_S3_ENDPOINT?.trim();
if (s3Hostname) {
	remotePatterns.push({ protocol: "https", hostname: s3Hostname });
}

const nextConfig: NextConfig = {
	typedRoutes: true,
	images: {
		remotePatterns,
	},
};

export default nextConfig;
