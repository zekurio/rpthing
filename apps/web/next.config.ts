import type { NextConfig } from "next";

const serverHostname = (() => {
	try {
		const url = process.env.NEXT_PUBLIC_SERVER_URL;
		return url ? new URL(url).hostname : undefined;
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
			...(serverHostname
				? ([
						{ protocol: "http", hostname: serverHostname },
						{ protocol: "https", hostname: serverHostname },
					] as const)
				: []),
		],
	},
};

export default nextConfig;
