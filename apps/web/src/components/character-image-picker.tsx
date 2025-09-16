"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { IconUploadButton } from "@/components/icon-upload-button";
import { cn } from "@/lib/utils";
import { queryClient, trpc } from "@/utils/trpc";

export function CharacterImagePicker({
	characterId,
	serverUrl,
	initialHasImage,
	onChanged,
	className,
}: {
	characterId: string;
	serverUrl: string;
	initialHasImage?: boolean;
	onChanged?: () => void;
	className?: string;
}) {
	const [hasImage, setHasImage] = useState(Boolean(initialHasImage));
	const [_isUploading, setUploading] = useState(false);
	const [_isDeleting, setDeleting] = useState(false);
	const [previewSrc, setPreviewSrc] = useState<string | null>(null);

	const { data: characterData } = useQuery({
		...trpc.character.getById.queryOptions({ id: characterId }),
	});

	const uploadFile = async (file: File) => {
		setUploading(true);
		try {
			const form = new FormData();
			form.append("file", file);
			const resp = await fetch(
				`${serverUrl}/api/upload/character-image/${characterId}`,
				{
					method: "POST",
					body: form,
					credentials: "include",
				},
			);
			if (!resp.ok) throw new Error("Upload failed");
			setHasImage(true);
			queryClient.invalidateQueries({
				queryKey: trpc.character.getById.queryKey({ id: characterId }),
			});
			onChanged?.();
		} finally {
			setUploading(false);
		}
	};

	const handleSelect = async (file: File | null, preview: string | null) => {
		setPreviewSrc(preview);
		if (file) {
			await uploadFile(file);
		}
	};

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await fetch(`${serverUrl}/api/upload/character-image/${characterId}`, {
				method: "DELETE",
				credentials: "include",
			});
			setHasImage(false);
			setPreviewSrc(null);
			queryClient.invalidateQueries({
				queryKey: trpc.character.getById.queryKey({ id: characterId }),
			});
			onChanged?.();
		} finally {
			setDeleting(false);
		}
	};

	useEffect(() => {
		if (characterData) {
			setHasImage(Boolean(characterData.referenceImageKey));
		}
	}, [characterData]);

	const displayPreview = hasImage
		? previewSrc || (characterData?.referenceImageKey ?? null)
		: null;

	return (
		<div className={cn("grid gap-2", className)}>
			<div className="flex items-center gap-3">
				<IconUploadButton
					previewSrc={displayPreview}
					onSelect={handleSelect}
					onRemove={handleDelete}
				/>
			</div>
		</div>
	);
}

export default CharacterImagePicker;
