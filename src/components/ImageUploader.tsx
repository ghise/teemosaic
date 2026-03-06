'use client';

import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import ImageCropModal from './ImageCropModal';

interface ImageUploaderProps {
    onUpload: (image: HTMLImageElement) => void;
}

export default function ImageUploader({ onUpload }: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            setCropImageUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = (croppedImg: HTMLImageElement) => {
        setCropImageUrl(null);
        onUpload(croppedImg);
    };

    const handleCropCancel = () => {
        setCropImageUrl(null);
    };

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };

    return (
        <>
            <div
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDragging
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                    : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileInput}
                    value="" // reset value to allow re-selecting the same file
                />
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <Upload size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-1">Upload Photo</h3>
                <p className="text-sm text-neutral-500 mb-4 px-4">
                    Drag & drop or click to upload a photo to convert into a mosaic.
                </p>
                <button className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium rounded-lg hover:bg-neutral-800 dark:hover:bg-white transition-colors">
                    Select Image
                </button>
            </div>

            {cropImageUrl && (
                <ImageCropModal
                    imageUrl={cropImageUrl}
                    onComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}
        </>
    );
}
