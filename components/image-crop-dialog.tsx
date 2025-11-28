"use client";

// Removed next/image
import { useCallback, useRef, useState } from "react";
import ReactCrop, {
	type Crop,
	centerCrop,
	makeAspectCrop,
	type PercentCrop,
	type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

import { Button } from "@/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogBody,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

interface ImageCropDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	imageSrc: string;
	onCropComplete?: (croppedFile: File) => void;
	onPercentComplete?: (percentCrop: PercentCrop) => void;
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
	onPercentComplete,
}: ImageCropDialogProps) {
	const [crop, setCrop] = useState<Crop>();
	const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
	const [completedPercentCrop, setCompletedPercentCrop] =
		useState<PercentCrop>();
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
			if (onPercentComplete && completedPercentCrop) {
				onPercentComplete(completedPercentCrop);
			}
			if (onCropComplete) {
				const croppedFile = await getCroppedImg(imgRef.current, completedCrop);
				onCropComplete(croppedFile);
			}
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
		<ResponsiveDialog open={open} onOpenChange={onOpenChange}>
			<ResponsiveDialogContent className="max-w-md">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Crop Image</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Crop your image to a square. Drag to move the crop area and use the
						handles to resize.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<ResponsiveDialogBody className="flex justify-center">
					<ReactCrop
						crop={crop}
						onChange={(_, percentCrop) => setCrop(percentCrop)}
						onComplete={(c, pc) => {
							setCompletedCrop(c);
							setCompletedPercentCrop(pc);
						}}
						aspect={aspect}
						minWidth={64}
						minHeight={64}
					>
						{/* biome-ignore lint/performance/noImgElement: cropper needs native img for canvas operations */}
						<img
							ref={imgRef}
							alt="Crop me"
							src={imageSrc}
							onLoad={
								onImageLoad as unknown as React.ReactEventHandler<HTMLImageElement>
							}
							className="max-h-80 max-w-full"
							loading="eager"
							decoding="async"
						/>
					</ReactCrop>
				</ResponsiveDialogBody>
				<ResponsiveDialogFooter>
					<Button
						variant="outline"
						onClick={handleCancel}
						className="w-full sm:w-auto"
					>
						Cancel
					</Button>
					<Button
						onClick={handleCropComplete}
						disabled={!completedCrop}
						className="w-full sm:w-auto"
					>
						Crop & Use
					</Button>
				</ResponsiveDialogFooter>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
