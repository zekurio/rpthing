"use client";

import { useState } from "react";
import { IconUploadButton } from "@/components/icon-upload-button";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
	previewSrc?: string | null;
	onSelect: (
		file: File | null,
		preview: string | null,
		meta?: {
			originalFile?: File | null;
			percentCrop?: {
				unit?: string;
				x?: number;
				y?: number;
				width?: number;
				height?: number;
			} | null;
		},
	) => void;
	onRemove?: () => void;
	className?: string;
	size?: "default" | "sm";
}

export function ImageUpload({
	previewSrc,
	onSelect,
	onRemove,
	className,
	size = "default",
}: ImageUploadProps) {
	const [imagePreview, setImagePreview] = useState<string | null>(null);

	const handleSelect = (
		file: File | null,
		preview: string | null,
		meta?: {
			originalFile?: File | null;
			percentCrop?: {
				unit?: string;
				x?: number;
				y?: number;
				width?: number;
				height?: number;
			} | null;
		},
	) => {
		setImagePreview(preview);
		onSelect(file, preview, meta);
	};

	const handleRemove = () => {
		setImagePreview(null);
		onSelect(null, null, { originalFile: null, percentCrop: null });
		onRemove?.();
	};

	const currentPreview = imagePreview || previewSrc;

	return (
		<div
			className={`flex items-center ${size === "sm" ? "gap-2" : "gap-3"} ${className || ""}`}
		>
			<IconUploadButton
				previewSrc={currentPreview}
				onSelect={handleSelect}
				showRemoveIcon={false}
				size={size}
			/>
			{currentPreview && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleRemove}
					className={size === "sm" ? "h-6 px-2 text-xs" : undefined}
				>
					Remove
				</Button>
			)}
		</div>
	);
}

export default ImageUpload;
