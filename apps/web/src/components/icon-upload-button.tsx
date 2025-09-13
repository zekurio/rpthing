"use client";

import { Camera, Plus } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "./image-crop-dialog";

interface IconUploadButtonProps {
	previewSrc?: string | null;
	onSelect?: (file: File | null, previewBase64: string | null) => void;
	className?: string;
	ariaLabel?: string;
	title?: string;
}

export function IconUploadButton({
	previewSrc,
	onSelect,
	className,
	ariaLabel = "Upload icon",
	title = "Upload icon",
}: IconUploadButtonProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [cropDialogOpen, setCropDialogOpen] = useState(false);
	const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

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
			if (result) {
				setSelectedImageSrc(result);
				setCropDialogOpen(true);
			}
			// Clear to allow re-selecting the same file
			if (fileInputRef.current) fileInputRef.current.value = "";
		};
		reader.onerror = () => {
			onSelect?.(null, null);
			if (fileInputRef.current) fileInputRef.current.value = "";
		};
		reader.readAsDataURL(file);
	};

	const handleCropComplete = async (croppedFile: File) => {
		// Create preview for the cropped image
		const reader = new FileReader();
		reader.onload = (e) => {
			const result = (e.target?.result as string) || null;
			onSelect?.(croppedFile, result);
		};
		reader.readAsDataURL(croppedFile);
	};

	return (
		<>
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
						"relative grid h-16 w-16 place-items-center rounded-full border-2 border-border border-dashed text-muted-foreground transition-colors hover:border-foreground hover:text-foreground",
						className,
					)}
					aria-label={ariaLabel}
					title={title}
				>
					{previewSrc ? (
						<Image
							src={previewSrc}
							alt="Preview"
							width={64}
							height={64}
							sizes="64px"
							className="h-16 w-16 rounded-full object-cover"
						/>
					) : (
						<Camera className="size-5" />
					)}
					<span className="-right-1 -top-1 absolute grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
						<Plus className="size-3" />
					</span>
				</button>
			</div>
			<ImageCropDialog
				open={cropDialogOpen}
				onOpenChange={setCropDialogOpen}
				imageSrc={selectedImageSrc || ""}
				onCropComplete={handleCropComplete}
			/>
		</>
	);
}

export default IconUploadButton;
