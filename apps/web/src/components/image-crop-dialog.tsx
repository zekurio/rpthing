"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import ReactCrop, {
	type Crop,
	centerCrop,
	makeAspectCrop,
	type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ImageCropDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	imageSrc: string;
	onCropComplete: (croppedFile: File) => void;
}

function centerAspectCrop(
	mediaWidth: number,
	mediaHeight: number,
	aspect: number,
) {
	return centerCrop(
		makeAspectCrop(
			{
				unit: "%",
				width: 90,
			},
			aspect,
			mediaWidth,
			mediaHeight,
		),
		mediaWidth,
		mediaHeight,
	);
}

export function ImageCropDialog({
	open,
	onOpenChange,
	imageSrc,
	onCropComplete,
}: ImageCropDialogProps) {
	const [crop, setCrop] = useState<Crop>();
	const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
	const [aspect, _setAspect] = useState<number | undefined>(1); // Square aspect ratio
	const imgRef = useRef<HTMLImageElement>(null);

	const onImageLoad = useCallback(
		(e: React.SyntheticEvent<HTMLImageElement>) => {
			if (aspect) {
				const { width, height } = e.currentTarget;
				setCrop(centerAspectCrop(width, height, aspect));
			}
		},
		[aspect],
	);

	const getCroppedImg = (
		image: HTMLImageElement,
		crop: PixelCrop,
	): Promise<File> => {
		return new Promise((resolve, reject) => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				reject(new Error("No 2d context"));
				return;
			}

			const scaleX = image.naturalWidth / image.width;
			const scaleY = image.naturalHeight / image.height;
			const pixelRatio = window.devicePixelRatio;

			canvas.width = crop.width * pixelRatio * scaleX;
			canvas.height = crop.height * pixelRatio * scaleY;

			ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
			ctx.imageSmoothingQuality = "high";

			ctx.drawImage(
				image,
				crop.x * scaleX,
				crop.y * scaleY,
				crop.width * scaleX,
				crop.height * scaleY,
				0,
				0,
				crop.width * scaleX,
				crop.height * scaleY,
			);

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						reject(new Error("Canvas is empty"));
						return;
					}
					const file = new File([blob], "cropped-image.png", {
						type: "image/png",
					});
					resolve(file);
				},
				"image/png",
				1,
			);
		});
	};

	const handleCropComplete = async () => {
		if (!imgRef.current || !completedCrop) return;

		try {
			const croppedFile = await getCroppedImg(imgRef.current, completedCrop);
			onCropComplete(croppedFile);
			onOpenChange(false);
		} catch (error) {
			console.error("Error cropping image:", error);
		}
	};

	const handleCancel = () => {
		setCrop(undefined);
		setCompletedCrop(undefined);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Crop Image</DialogTitle>
					<DialogDescription>
						Crop your image to a square. Drag to move the crop area and use the
						handles to resize.
					</DialogDescription>
				</DialogHeader>
				<div className="flex justify-center">
					<ReactCrop
						crop={crop}
						onChange={(_, percentCrop) => setCrop(percentCrop)}
						onComplete={(c) => setCompletedCrop(c)}
						aspect={aspect}
						minWidth={64}
						minHeight={64}
					>
						<Image
							ref={imgRef}
							alt="Crop me"
							src={imageSrc}
							onLoad={onImageLoad}
							className="max-h-80 max-w-full"
							width={400}
							height={400}
							unoptimized
						/>
					</ReactCrop>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button onClick={handleCropComplete} disabled={!completedCrop}>
						Crop & Use
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
