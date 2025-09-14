import type { NextConfig } from "next";

const s3Hostname = (() => {
	try {
		const endpoint = process.env.S3_ENDPOINT;
		if (endpoint) {
			return new URL(endpoint).hostname;
		}
		return undefined;
	} catch {
		return undefined;
	}
})();

const nextConfig: NextConfig = {
	output: "standalone",
	typedRoutes: true,
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "cdn.discordapp.com" },
			...(s3Hostname
				? ([
						{ protocol: "http", hostname: s3Hostname },
						{ protocol: "https", hostname: s3Hostname },
					] as const)
				: []),
		],
	},
};

export default nextConfig;
