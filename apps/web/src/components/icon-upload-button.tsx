"use client";

import { Camera, Plus } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface IconUploadButtonProps {
	previewSrc?: string | null;
	onSelect?: (file: File | null, previewBase64: string | null) => void;
	size?: 12 | 16 | 20 | 24; // tailwind size token to apply with size-*
	className?: string;
	ariaLabel?: string;
	title?: string;
}

export function IconUploadButton({
	previewSrc,
	onSelect,
	size = 16,
	className,
	ariaLabel = "Upload icon",
	title = "Upload icon",
}: IconUploadButtonProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] || null;
		if (!file) {
			onSelect?.(null, null);
			// Clear input value so selecting same file later still triggers change
			if (fileInputRef.current) fileInputRef.current.value = "";
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const result = (e.target?.result as string) || null;
			onSelect?.(file, result);
			// Clear to allow re-selecting the same file
			if (fileInputRef.current) fileInputRef.current.value = "";
		};
		reader.onerror = () => {
			onSelect?.(null, null);
			if (fileInputRef.current) fileInputRef.current.value = "";
		};
		reader.readAsDataURL(file);
	};

	return (
		<div className="relative inline-flex items-center">
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				onChange={handleFileSelect}
				className="hidden"
			/>
			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				className={cn(
					"relative grid place-items-center rounded-full border-2 border-border border-dashed text-muted-foreground transition-colors hover:border-foreground hover:text-foreground",
					`size-${size}`,
					className,
				)}
				aria-label={ariaLabel}
				title={title}
			>
				{previewSrc ? (
					<Image
						src={previewSrc}
						alt="Preview"
						width={size === 24 ? 96 : size === 20 ? 80 : size === 16 ? 64 : 48}
						height={size === 24 ? 96 : size === 20 ? 80 : size === 16 ? 64 : 48}
						sizes={
							size === 24
								? "96px"
								: size === 20
									? "80px"
									: size === 16
										? "64px"
										: "48px"
						}
						className={cn(
							"rounded-full object-cover",
							size === 24
								? "h-24 w-24"
								: size === 20
									? "h-20 w-20"
									: size === 16
										? "h-16 w-16"
										: "h-12 w-12",
						)}
					/>
				) : (
					<Camera className="size-5" />
				)}
				<span className="-right-1 -top-1 absolute grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
					<Plus className="size-3" />
				</span>
			</button>
		</div>
	);
}

export default IconUploadButton;
