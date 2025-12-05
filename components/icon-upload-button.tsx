"use client";

import { Camera, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { cn } from "@/lib/utils";

interface IconUploadButtonProps {
	previewSrc?: string | null;
	onSelect?: (
		file: File | null,
		previewBase64: string | null,
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
	ariaLabel?: string;
	title?: string;
	showRemoveIcon?: boolean;
	size?: "default" | "sm";
}

export function IconUploadButton({
	previewSrc,
	onSelect,
	onRemove,
	className,
	ariaLabel = "Upload icon",
	title = "Upload icon",
	showRemoveIcon = true,
	size = "default",
}: IconUploadButtonProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [cropDialogOpen, setCropDialogOpen] = useState(false);
	const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
	const originalFileRef = useRef<File | null>(null);
	const percentCropRef = useRef<{
		unit?: string;
		x?: number;
		y?: number;
		width?: number;
		height?: number;
	} | null>(null);

	const resetInput = () => {
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] || null;
		if (!file) {
			onSelect?.(null, null, { originalFile: null, percentCrop: null });
			resetInput();
			return;
		}

		// Client-side validation: only images, block GIFs
		const mime = file.type || "";
		const name = (file as unknown as { name?: string }).name || "";
		const lowerName = name.toLowerCase();
		const isImage = mime.startsWith("image/");
		const isGif = mime === "image/gif" || lowerName.endsWith(".gif");
		if (!isImage || isGif) {
			toast.error(
				isGif
					? "GIF images are not supported."
					: "Please select an image file.",
			);
			onSelect?.(null, null, { originalFile: null, percentCrop: null });
			resetInput();
			return;
		}

		originalFileRef.current = file;

		const reader = new FileReader();
		reader.onload = (e) => {
			const result = (e.target?.result as string) || null;
			if (result) {
				setSelectedImageSrc(result);
				setCropDialogOpen(true);
			}
			resetInput();
		};
		reader.onerror = () => {
			onSelect?.(null, null, { originalFile: null, percentCrop: null });
			resetInput();
		};
		reader.readAsDataURL(file);
	};

	const handleCropComplete = async (croppedFile: File) => {
		// Create preview for the cropped image
		const reader = new FileReader();
		reader.onload = (e) => {
			const result = (e.target?.result as string) || null;
			onSelect?.(croppedFile, result, {
				originalFile: originalFileRef.current,
				percentCrop: percentCropRef.current,
			});
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
						"relative grid place-items-center rounded-lg border-2 border-border border-dashed text-muted-foreground transition-colors hover:border-foreground hover:text-foreground",
						size === "sm" ? "h-12 w-12" : "h-16 w-16",
						className,
					)}
					aria-label={ariaLabel}
					title={title}
				>
					{previewSrc ? (
						<Image
							src={previewSrc}
							alt="Preview"
							width={size === "sm" ? 40 : 56}
							height={size === "sm" ? 40 : 56}
							className={cn(
								"rounded object-cover",
								size === "sm" ? "h-10 w-10" : "h-14 w-14",
							)}
							priority={false}
						/>
					) : (
						<Camera className={size === "sm" ? "size-4" : "size-5"} />
					)}
					<span
						className={cn(
							"-right-1 -top-1 absolute grid place-items-center rounded-full bg-primary text-primary-foreground shadow-sm",
							size === "sm" ? "size-4" : "size-5",
						)}
					>
						<Plus className={size === "sm" ? "size-2.5" : "size-3"} />
					</span>
				</button>
				{previewSrc && showRemoveIcon ? (
					<button
						type="button"
						className="ml-2 grid h-7 w-7 place-items-center rounded-full border text-muted-foreground hover:text-foreground"
						onClick={() => onRemove?.()}
						aria-label="Remove image"
						title="Remove image"
					>
						<Trash2 className="h-3.5 w-3.5" />
					</button>
				) : null}
			</div>
			<ImageCropDialog
				open={cropDialogOpen}
				onOpenChange={setCropDialogOpen}
				imageSrc={selectedImageSrc || ""}
				onCropComplete={handleCropComplete}
				onPercentComplete={(pc) => {
					percentCropRef.current = pc
						? {
								unit: "%",
								x: pc.x,
								y: pc.y,
								width: pc.width,
								height: pc.height,
							}
						: null;
				}}
			/>
		</>
	);
}

export default IconUploadButton;
