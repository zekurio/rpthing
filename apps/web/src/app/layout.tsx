import type { Metadata } from "next";
import { Geist_Mono, JetBrains_Mono } from "next/font/google";
import "../index.css";
import Providers from "@/components/providers";

const jetBrainsMono = JetBrains_Mono({
	variable: "--font-jetbrainsmono-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "rpthing",
	description: "rpthing",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistMono.variable} ${jetBrainsMono.variable} h-dvh overflow-hidden antialiased`}
			>
				<Providers>
					<div className="flex h-full min-h-0">
						<div className="min-w-0 flex-1">{children}</div>
					</div>
				</Providers>
			</body>
		</html>
	);
}
