'use client';

import { useState, useRef } from 'react';
import ReactCrop, { type Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Crop as CropIcon, Square } from 'lucide-react';

interface ImageCropModalProps {
    imageUrl: string;
    onCancel: () => void;
    onComplete: (croppedImage: HTMLImageElement) => void;
}

function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    )
}

export default function ImageCropModal({ imageUrl, onCancel, onComplete }: ImageCropModalProps) {
    const [crop, setCrop] = useState<Crop>();
    const [aspect, setAspect] = useState<number | undefined>(undefined);
    const imgRef = useRef<HTMLImageElement>(null);

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        if (aspect) {
            const { width, height } = e.currentTarget;
            setCrop(centerAspectCrop(width, height, aspect));
        }
    };

    const handleApply = () => {
        if (!imgRef.current) return;

        const image = imgRef.current;
        const currentCrop = crop as PixelCrop;

        if (!currentCrop || currentCrop.width === 0 || currentCrop.height === 0) {
            // If no crop, just return original image
            const img = new Image();
            img.onload = () => onComplete(img);
            img.src = imageUrl;
            return;
        }

        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        canvas.width = Math.floor(currentCrop.width * scaleX);
        canvas.height = Math.floor(currentCrop.height * scaleY);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(
            image,
            currentCrop.x * scaleX,
            currentCrop.y * scaleY,
            currentCrop.width * scaleX,
            currentCrop.height * scaleY,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const croppedImg = new Image();
        croppedImg.onload = () => {
            onComplete(croppedImg);
        };
        croppedImg.src = canvas.toDataURL('image/png', 1.0);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-700">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <CropIcon size={20} className="text-emerald-500" />
                        Crop Image
                    </h2>
                    <button
                        onClick={onCancel}
                        className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 flex justify-center items-center bg-neutral-100 dark:bg-neutral-900 min-h-[300px]">
                    <ReactCrop
                        crop={crop}
                        onChange={(pixelCrop) => setCrop(pixelCrop)}
                        aspect={aspect}
                        className="max-h-[60vh]"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            ref={imgRef}
                            src={imageUrl}
                            alt="Crop preview"
                            onLoad={onImageLoad}
                            className="max-h-[60vh] object-contain"
                            crossOrigin="anonymous"
                        />
                    </ReactCrop>
                </div>

                <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-neutral-800">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setAspect(undefined);
                                setCrop(undefined);
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${!aspect ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}
                        >
                            <CropIcon size={16} /> Freeform
                        </button>
                        <button
                            onClick={() => {
                                setAspect(1);
                                if (imgRef.current) {
                                    setCrop(centerAspectCrop(imgRef.current.width, imgRef.current.height, 1));
                                }
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${aspect === 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}
                        >
                            <Square size={16} /> 1:1 Square
                        </button>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={onCancel}
                            className="flex-1 sm:flex-none px-6 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            className="flex-1 sm:flex-none px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all font-medium text-sm"
                        >
                            Apply Crop
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
