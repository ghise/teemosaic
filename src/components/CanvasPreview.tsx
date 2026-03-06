'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import useMosaicStore from '@/store/useMosaicStore';
import { processImage } from '@/utils/imageProcessing';
import { ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 10;
const ZOOM_STEP = 0.25;
const ZOOM_WHEEL_SENSITIVITY = 0.002;

export default function CanvasPreview() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        originalImage,
        gridWidth,
        contrast,
        gamma,
        edgeStrength,
        posterizeLevels,
        useKMeans,
        ditheringMode,
        hybridMode,
        bgThreshold,
        setBom,
        setMosaicData
    } = useMosaicStore();

    const [isProcessing, setIsProcessing] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const panOrigin = useRef({ x: 0, y: 0 });

    // Clamp zoom level
    const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

    // Reset zoom & pan when image or grid changes
    useEffect(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [originalImage, gridWidth]);

    const handleZoomIn = useCallback(() => {
        setZoom(prev => clampZoom(prev + ZOOM_STEP));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom(prev => clampZoom(prev - ZOOM_STEP));
    }, []);

    const handleFitToView = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    // Mouse wheel zoom — must use native listener with { passive: false } to prevent page scroll
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = -e.deltaY * ZOOM_WHEEL_SENSITIVITY;
            setZoom(prev => clampZoom(prev * (1 + delta)));
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    // Pan: mouse down
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only pan with left click
        if (e.button !== 0) return;
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY };
        panOrigin.current = { ...pan };
    }, [pan]);

    // Pan: mouse move
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning) return;
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setPan({
            x: panOrigin.current.x + dx,
            y: panOrigin.current.y + dy
        });
    }, [isPanning]);

    // Pan: mouse up
    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Also stop panning if mouse leaves
    const handleMouseLeave = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === '=' || e.key === '+') {
                e.preventDefault();
                setZoom(prev => clampZoom(prev + ZOOM_STEP));
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                setZoom(prev => clampZoom(prev - ZOOM_STEP));
            } else if (e.key === '0') {
                e.preventDefault();
                setZoom(1);
                setPan({ x: 0, y: 0 });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!originalImage || !canvasRef.current) return;

        let isCancelled = false;

        // 1. Trigger the loading state
        setTimeout(() => {
            if (isCancelled) return;
            setIsProcessing(true);

            // 2. Yield to browser to actually paint the loading spinner, then process
            setTimeout(() => {
                if (isCancelled) return;

                const canvas = canvasRef.current;
                if (!canvas) {
                    setIsProcessing(false);
                    return;
                }

                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) {
                    setIsProcessing(false);
                    return;
                }

                // Calculate grid height based on aspect ratio
                const aspect = originalImage.height / originalImage.width;
                const gridHeight = Math.round(gridWidth * aspect);

                if (gridWidth <= 0 || gridHeight <= 0 || isNaN(gridHeight)) {
                    setIsProcessing(false);
                    return;
                }

                // We use a hidden canvas to resize the image down to exactly 1 pixel per Tee
                const offscreen = document.createElement('canvas');
                offscreen.width = gridWidth;
                offscreen.height = gridHeight;
                const octx = offscreen.getContext('2d');
                if (!octx) {
                    setIsProcessing(false);
                    return;
                }

                try {
                    octx.drawImage(originalImage, 0, 0, gridWidth, gridHeight);
                    const imgData = octx.getImageData(0, 0, gridWidth, gridHeight);

                    // Process the raw pixels (apply BC, mapping, and dithering)
                    const { mosaicData, bom } = processImage(
                        imgData,
                        gridWidth,
                        gridHeight,
                        contrast,
                        gamma,
                        edgeStrength,
                        posterizeLevels,
                        useKMeans,
                        ditheringMode,
                        hybridMode,
                        bgThreshold
                    );

                    setBom(bom);
                    setMosaicData(mosaicData);

                    // Upscale for display rendering (draw circles instead of square pixels)
                    const maxWidth = canvas.parentElement?.parentElement?.clientWidth || 800;
                    const displayScale = Math.max(1, Math.floor(maxWidth / gridWidth));

                    const padding = 1;
                    const cellSize = displayScale;
                    const radius = Math.max(1, (cellSize - padding) / 2);

                    canvas.width = gridWidth * cellSize;
                    canvas.height = gridHeight * cellSize;

                    // Fill background (pegboard color)
                    ctx.fillStyle = '#262626'; // dark gray board
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    for (let y = 0; y < gridHeight; y++) {
                        for (let x = 0; x < gridWidth; x++) {
                            const { color } = mosaicData[y][x];

                            const cx = x * cellSize + cellSize / 2;
                            const cy = y * cellSize + cellSize / 2;

                            ctx.beginPath();
                            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                            ctx.fillStyle = color;
                            ctx.fill();

                            // Add a subtle shadow/highlight for depth
                            ctx.beginPath();
                            ctx.arc(cx - radius * 0.2, cy - radius * 0.2, radius * 0.3, 0, Math.PI * 2);
                            ctx.fillStyle = 'rgba(255,255,255,0.2)';
                            ctx.fill();
                        }
                    }
                } catch (err) {
                    console.error("Error accessing image data or processing mosaic:", err);
                } finally {
                    if (!isCancelled) {
                        setIsProcessing(false);
                    }
                }
            }, 50);
        }, 0);

        return () => {
            isCancelled = true;
        };

    }, [originalImage, gridWidth, contrast, gamma, edgeStrength, posterizeLevels, useKMeans, ditheringMode, hybridMode, bgThreshold, setBom, setMosaicData]);

    const zoomPercent = Math.round(zoom * 100);

    return (
        <div className="relative w-full h-full flex flex-col rounded-xl">
            {/* Zoom controls toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-neutral-100 dark:bg-neutral-700/50 rounded-t-xl border-b border-neutral-200 dark:border-neutral-600 flex-shrink-0">
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleZoomOut}
                        disabled={zoom <= ZOOM_MIN}
                        className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Zoom out (−)"
                    >
                        <ZoomOut size={16} />
                    </button>

                    <div className="w-20 text-center">
                        <span className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-200 select-none">
                            {zoomPercent}%
                        </span>
                    </div>

                    <button
                        onClick={handleZoomIn}
                        disabled={zoom >= ZOOM_MAX}
                        className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Zoom in (+)"
                    >
                        <ZoomIn size={16} />
                    </button>

                    <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-500 mx-1" />

                    <button
                        onClick={handleFitToView}
                        className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 transition-colors"
                        title="Fit to view (0)"
                    >
                        <Maximize size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                    <Move size={12} />
                    <span className="text-[10px] font-medium select-none">Drag to pan · Scroll to zoom</span>
                </div>
            </div>

            {/* Zoomable & pannable canvas area */}
            <div
                ref={containerRef}
                className="relative flex-1 overflow-hidden rounded-b-xl"
                style={{ cursor: isPanning ? 'grabbing' : 'grab' }}

                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            >
                {isProcessing && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-b-xl">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Processing Map...</p>
                        </div>
                    </div>
                )}

                <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ minHeight: '400px' }}
                >
                    <canvas
                        ref={canvasRef}
                        className="shadow-2xl rounded"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transformOrigin: 'center center',
                            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
                            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                            maxWidth: '100%',
                            height: 'auto',
                            imageRendering: zoom > 2 ? 'pixelated' : 'auto',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
