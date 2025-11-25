import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const url = request.nextUrl.searchParams.get("url");

	if (!url) {
		return NextResponse.json(
			{ error: "Missing url parameter" },
			{ status: 400 },
		);
	}

	// Validate the URL is from our S3 bucket
	const allowedHosts = [
		"s3.rpthing.zekurio.xyz",
		// Add other allowed hosts here
	];

	try {
		const parsedUrl = new URL(url);
		if (!allowedHosts.some((host) => parsedUrl.hostname === host)) {
			return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
		}
	} catch {
		return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
	}

	try {
		const response = await fetch(url);

		if (!response.ok) {
			return NextResponse.json(
				{ error: "Failed to fetch image" },
				{ status: response.status },
			);
		}

		const contentType = response.headers.get("content-type") || "image/jpeg";
		const buffer = await response.arrayBuffer();

		return new NextResponse(buffer, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=31536000, immutable",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		console.error("Proxy image error:", error);
		return NextResponse.json(
			{ error: "Failed to proxy image" },
			{ status: 500 },
		);
	}
}
