import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function s3UrlFromKey(key?: string | null): string | null {
	// No longer needed; server presigns like realms. Keep as stub for safety.
	return key ?? null;
}

// Upload a file with progress using XHR (fetch lacks granular progress for uploads)
export function uploadWithProgress(opts: {
	url: string;
	formData: FormData;
	onProgress?: (percent: number) => void;
	withCredentials?: boolean;
	method?: "POST" | "PUT";
	headers?: Record<string, string>;
}): Promise<Response> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open(opts.method ?? "POST", opts.url, true);
		if (opts.withCredentials) xhr.withCredentials = true;
		if (opts.headers) {
			for (const [k, v] of Object.entries(opts.headers)) {
				xhr.setRequestHeader(k, v);
			}
		}
		xhr.upload.onprogress = (event) => {
			if (!opts.onProgress) return;
			if (event.lengthComputable) {
				const percent = Math.max(
					0,
					Math.min(100, (event.loaded / event.total) * 100),
				);
				opts.onProgress(percent);
			} else {
				// Indeterminate – send -1 to indicate unknown length
				opts.onProgress(-1);
			}
		};
		xhr.onload = () => {
			const status = xhr.status;
			const body = xhr.responseText;
			const response = new Response(body, { status });
			// Always resolve like native fetch - let caller check response.ok
			resolve(response);
		};
		xhr.onerror = () => reject(new TypeError("Network request failed"));
		xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
		xhr.send(opts.formData);
	});
}
