type RGB = [number, number, number];

export type TeeColor = 'W' | 'K' | 'R' | 'G' | 'B' | 'Y';

export type DitheringMode = 'none' | 'floyd-steinberg' | 'atkinson' | 'bayer';

export interface ColorPalette {
    white: RGB;
    black: RGB;
    red: RGB;
    green: RGB;
    blue: RGB;
    yellow: RGB;
}

export interface BOM {
    white: number;
    black: number;
    red: number;
    green: number;
    blue: number;
    yellow: number;
}

export interface ProcessedResult {
    imageData: ImageData;
    mosaicData: { type: TeeColor; color: string }[][];
    bom: BOM;
}

// Fixed palette colors for tees
const TEE_PALETTE: ColorPalette = {
    white: [255, 255, 255],
    black: [0, 0, 0],
    red: [220, 38, 38],      // A strong red
    green: [22, 163, 74],     // A vivid green
    blue: [37, 99, 235],      // A rich blue
    yellow: [250, 204, 21],   // A bright yellow
};

const PALETTE_ENTRIES: { key: keyof ColorPalette; type: TeeColor; hex: string }[] = [
    { key: 'white', type: 'W', hex: '#FFFFFF' },
    { key: 'black', type: 'K', hex: '#000000' },
    { key: 'red', type: 'R', hex: '#DC2626' },
    { key: 'green', type: 'G', hex: '#16A34A' },
    { key: 'blue', type: 'B', hex: '#2563EB' },
    { key: 'yellow', type: 'Y', hex: '#FACC15' },
];

// Calculate Euclidean distance between two RGB colors
function colorDistance(c1: RGB, c2: RGB): number {
    return Math.sqrt(
        Math.pow(c1[0] - c2[0], 2) +
        Math.pow(c1[1] - c2[1], 2) +
        Math.pow(c1[2] - c2[2], 2)
    );
}

// Find closest color in palette
function findClosestPaletteColor(pixel: RGB): { type: TeeColor; rgb: RGB; hex: string } {
    let bestDist = Infinity;
    let best = PALETTE_ENTRIES[0];

    for (const entry of PALETTE_ENTRIES) {
        const d = colorDistance(pixel, TEE_PALETTE[entry.key]);
        if (d < bestDist) {
            bestDist = d;
            best = entry;
        }
    }

    return { type: best.type, rgb: TEE_PALETTE[best.key], hex: best.hex };
}

// Find the palette entry closest to an arbitrary RGB value
function findClosestPaletteEntry(c: RGB): typeof PALETTE_ENTRIES[0] {
    let bestDist = Infinity;
    let best = PALETTE_ENTRIES[0];
    for (const entry of PALETTE_ENTRIES) {
        const d = colorDistance(c, TEE_PALETTE[entry.key]);
        if (d < bestDist) {
            bestDist = d;
            best = entry;
        }
    }
    return best;
}

// Apply Contrast & Gamma (brightness removed)
function adjustPixel(pixel: number, contrastFactor: number, gammaInv: number): number {
    let p = pixel;
    // Contrast
    p = contrastFactor * (p - 128) + 128;
    // Gamma correction (applied on normalized 0-1 range)
    p = Math.max(0, Math.min(255, p));
    p = 255 * Math.pow(p / 255, gammaInv);
    return Math.max(0, Math.min(255, p));
}

// ── Sobel Edge Enhancement ──────────────────────────────────────────────────
// Computes gradient magnitude per pixel and blends dark edge values onto the
// original data.  strength 0 = no-op, 100 = full edge overlay.
function applySobelEdges(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    strength: number
): void {
    if (strength <= 0) return;

    const t = strength / 100; // blend factor

    // Convert to grayscale for edge detection
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // Sobel kernels
    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    // Compute magnitude (skip 1-pixel border)
    const mag = new Float32Array(width * height);
    let maxMag = 0;
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sx = 0, sy = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const g = gray[(y + ky) * width + (x + kx)];
                    const ki = (ky + 1) * 3 + (kx + 1);
                    sx += g * gx[ki];
                    sy += g * gy[ki];
                }
            }
            const m = Math.sqrt(sx * sx + sy * sy);
            mag[y * width + x] = m;
            if (m > maxMag) maxMag = m;
        }
    }

    // Normalize and blend – edges become dark (black)
    if (maxMag === 0) return;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const edgeNorm = Math.min(1, mag[y * width + x] / maxMag); // 0 = flat, 1 = edge
            const darken = 1 - edgeNorm * t; // 1 = no change, 0 = fully black
            data[i] = Math.max(0, Math.min(255, data[i] * darken));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * darken));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * darken));
        }
    }
}

// ── Posterization ───────────────────────────────────────────────────────────
// Reduces tonal range per channel.  levels = number of distinct values per
// channel (2-16).  Lower = more aggressive quantization.
function posterize(data: Uint8ClampedArray, levels: number): void {
    if (levels >= 256) return; // effectively no-op
    const step = 256 / levels;
    const halfStep = step / 2;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.floor(data[i] / step) * step + halfStep);
        data[i + 1] = Math.min(255, Math.floor(data[i + 1] / step) * step + halfStep);
        data[i + 2] = Math.min(255, Math.floor(data[i + 2] / step) * step + halfStep);
    }
}

// ── K-Means Clustering Color Mapping ────────────────────────────────────────
// Uses K-Means (k=6, initialized to the tee palette) to assign every pixel to
// one of the six tee colors.  After each iteration the centroids are snapped
// back to the nearest palette color so the final mapping always uses real tee
// colors.  Returns mosaicData + bom directly.
function kMeansColorMap(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    iterations: number = 10
): { mosaicData: { type: TeeColor; color: string }[][]; bom: BOM } {
    const n = width * height;

    // Initialize centroids to the palette colours
    const centroids: RGB[] = PALETTE_ENTRIES.map(e => [...TEE_PALETTE[e.key]] as RGB);

    // Assignment buffer – which centroid each pixel belongs to
    const assignments = new Uint8Array(n);

    for (let iter = 0; iter < iterations; iter++) {
        // Assign each pixel to the nearest centroid
        for (let p = 0; p < n; p++) {
            const idx = p * 4;
            const px: RGB = [data[idx], data[idx + 1], data[idx + 2]];
            let bestD = Infinity;
            let bestC = 0;
            for (let c = 0; c < 6; c++) {
                const d = colorDistance(px, centroids[c]);
                if (d < bestD) {
                    bestD = d;
                    bestC = c;
                }
            }
            assignments[p] = bestC;
        }

        // Recompute centroids
        const sums: number[][] = Array.from({ length: 6 }, () => [0, 0, 0]);
        const counts = new Uint32Array(6);

        for (let p = 0; p < n; p++) {
            const idx = p * 4;
            const c = assignments[p];
            sums[c][0] += data[idx];
            sums[c][1] += data[idx + 1];
            sums[c][2] += data[idx + 2];
            counts[c]++;
        }

        for (let c = 0; c < 6; c++) {
            if (counts[c] > 0) {
                const avg: RGB = [
                    Math.round(sums[c][0] / counts[c]),
                    Math.round(sums[c][1] / counts[c]),
                    Math.round(sums[c][2] / counts[c]),
                ];
                // Snap centroid back to nearest palette color
                const snapped = findClosestPaletteEntry(avg);
                centroids[c] = [...TEE_PALETTE[snapped.key]] as RGB;
            }
        }
    }

    // Build mosaicData and bom from final assignments
    const mosaicData: { type: TeeColor; color: string }[][] =
        Array.from({ length: height }, () => Array(width));
    const bom: BOM = { white: 0, black: 0, red: 0, green: 0, blue: 0, yellow: 0 };
    const typeToKey: Record<TeeColor, keyof BOM> = {
        W: 'white', K: 'black', R: 'red', G: 'green', B: 'blue', Y: 'yellow'
    };

    for (let p = 0; p < n; p++) {
        const c = assignments[p];
        // Map centroid to the palette entry it was snapped to
        const entry = findClosestPaletteEntry(centroids[c]);
        const y = Math.floor(p / width);
        const x = p % width;
        mosaicData[y][x] = { type: entry.type, color: entry.hex };
        bom[typeToKey[entry.type]]++;

        // Also rewrite the pixel data for ImageData output
        const idx = p * 4;
        data[idx] = TEE_PALETTE[entry.key][0];
        data[idx + 1] = TEE_PALETTE[entry.key][1];
        data[idx + 2] = TEE_PALETTE[entry.key][2];
    }

    return { mosaicData, bom };
}

// ── Ordered (Bayer) Dithering ───────────────────────────────────────────────
// 4×4 Bayer threshold matrix, normalized to 0-1 range.
const BAYER_4X4 = [
    [0 / 16, 8 / 16, 2 / 16, 10 / 16],
    [12 / 16, 4 / 16, 14 / 16, 6 / 16],
    [3 / 16, 11 / 16, 1 / 16, 9 / 16],
    [15 / 16, 7 / 16, 13 / 16, 5 / 16],
];

function applyBayerDither(
    data: Uint8ClampedArray,
    width: number,
    height: number
): { mosaicData: { type: TeeColor; color: string }[][]; bom: BOM } {
    const mosaicData: { type: TeeColor; color: string }[][] =
        Array(height).fill(null).map(() => Array(width));
    const bom: BOM = { white: 0, black: 0, red: 0, green: 0, blue: 0, yellow: 0 };
    const typeToKey: Record<TeeColor, keyof BOM> = {
        W: 'white', K: 'black', R: 'red', G: 'green', B: 'blue', Y: 'yellow'
    };

    // Spread factor — controls how much the Bayer threshold offsets each channel
    const spread = 64;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const threshold = BAYER_4X4[y % 4][x % 4] - 0.5; // center around 0

            const r = Math.max(0, Math.min(255, data[i] + spread * threshold));
            const g = Math.max(0, Math.min(255, data[i + 1] + spread * threshold));
            const b = Math.max(0, Math.min(255, data[i + 2] + spread * threshold));

            const closest = findClosestPaletteColor([r, g, b]);

            data[i] = closest.rgb[0];
            data[i + 1] = closest.rgb[1];
            data[i + 2] = closest.rgb[2];

            mosaicData[y][x] = { type: closest.type, color: closest.hex };
            bom[typeToKey[closest.type]]++;
        }
    }

    return { mosaicData, bom };
}

// ── Detail Mask (Subject / Background Separator) ────────────────────────────
// Builds a boolean mask where `true` = subject (high local detail) and
// `false` = background (flat / uniform area).  Uses local luminance standard
// deviation in a 5×5 window.  `threshold` (0-100) controls sensitivity —
// lower values classify more of the image as background.
function buildDetailMask(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    threshold: number
): boolean[] {
    const n = width * height;
    const gray = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const idx = i * 4;
        gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // Compute local std-dev in a 5×5 neighbourhood
    const halfW = 2; // 5x5 window
    const localStdDev = new Float32Array(n);
    let maxStdDev = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0, sumSq = 0, count = 0;
            for (let ky = -halfW; ky <= halfW; ky++) {
                for (let kx = -halfW; kx <= halfW; kx++) {
                    const ny = y + ky, nx = x + kx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        const v = gray[ny * width + nx];
                        sum += v;
                        sumSq += v * v;
                        count++;
                    }
                }
            }
            const mean = sum / count;
            const sd = Math.sqrt(Math.max(0, sumSq / count - mean * mean));
            localStdDev[y * width + x] = sd;
            if (sd > maxStdDev) maxStdDev = sd;
        }
    }

    // Normalize and threshold — `threshold` is 0-100, maps to fraction of maxStdDev
    const cutoff = (threshold / 100) * maxStdDev;
    const mask = new Array<boolean>(n);
    for (let i = 0; i < n; i++) {
        mask[i] = localStdDev[i] >= cutoff; // true = subject (detailed)
    }
    return mask;
}

// ── Main Processing Pipeline ────────────────────────────────────────────────
export function processImage(
    imageData: ImageData,
    width: number,
    height: number,
    contrast: number,
    gamma: number,
    edgeStrength: number,
    posterizeLevels: number,
    useKMeans: boolean,
    ditheringMode: DitheringMode,
    hybridMode: boolean = false,
    bgThreshold: number = 15
): ProcessedResult {
    const data = new Uint8ClampedArray(imageData.data);

    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const gammaInv = gamma > 0 ? 1 / gamma : 1;

    // 1. Contrast + Gamma
    for (let i = 0; i < data.length; i += 4) {
        data[i] = adjustPixel(data[i], contrastFactor, gammaInv);
        data[i + 1] = adjustPixel(data[i + 1], contrastFactor, gammaInv);
        data[i + 2] = adjustPixel(data[i + 2], contrastFactor, gammaInv);
        data[i + 3] = 255;
    }

    // 2. Edge Enhancement
    applySobelEdges(data, width, height, edgeStrength);

    // 3. Posterization
    if (posterizeLevels < 256) {
        posterize(data, posterizeLevels);
    }

    // ── Hybrid Mode: build detail mask BEFORE color mapping ─────────────
    const detailMask = hybridMode ? buildDetailMask(data, width, height, bgThreshold) : null;

    // 4. Color Mapping
    if (useKMeans && !hybridMode) {
        // Pure K-Means (no hybrid) — original behaviour
        const { mosaicData, bom } = kMeansColorMap(data, width, height);
        return { imageData: new ImageData(data, width, height), mosaicData, bom };
    }

    // 4b. Bayer (ordered) dithering — handled separately since it doesn't use error diffusion
    if (ditheringMode === 'bayer' && !hybridMode) {
        const { mosaicData, bom } = applyBayerDither(data, width, height);
        return { imageData: new ImageData(data, width, height), mosaicData, bom };
    }

    // 4c. Nearest-neighbor with optional error-diffusion dithering
    //     In hybrid mode: background pixels get clean nearest-color,
    //     subject pixels get dithering, error only propagates to other subject pixels.
    const mosaicData: { type: TeeColor; color: string }[][] =
        Array(height).fill(null).map(() => Array(width));
    const bom: BOM = { white: 0, black: 0, red: 0, green: 0, blue: 0, yellow: 0 };
    const typeToKey: Record<TeeColor, keyof BOM> = {
        W: 'white', K: 'black', R: 'red', G: 'green', B: 'blue', Y: 'yellow'
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const pixelIdx = y * width + x;
            const isSubject = detailMask ? detailMask[pixelIdx] : true;

            const oldR = data[i];
            const oldG = data[i + 1];
            const oldB = data[i + 2];

            const closest = findClosestPaletteColor([oldR, oldG, oldB]);

            data[i] = closest.rgb[0];
            data[i + 1] = closest.rgb[1];
            data[i + 2] = closest.rgb[2];

            mosaicData[y][x] = { type: closest.type, color: closest.hex };
            bom[typeToKey[closest.type]]++;

            // Error diffusion — only for subject pixels (or all pixels if not hybrid)
            const shouldDither = isSubject && ditheringMode !== 'none';

            if (shouldDither) {
                const errR = oldR - closest.rgb[0];
                const errG = oldG - closest.rgb[1];
                const errB = oldB - closest.rgb[2];

                const propagateError = (dx: number, dy: number, ratio: number) => {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        // In hybrid mode, only propagate error to other subject pixels
                        if (detailMask && !detailMask[ny * width + nx]) return;
                        const idx = (ny * width + nx) * 4;
                        data[idx] = Math.max(0, Math.min(255, data[idx] + errR * ratio));
                        data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + errG * ratio));
                        data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + errB * ratio));
                    }
                };

                if (ditheringMode === 'floyd-steinberg') {
                    propagateError(1, 0, 7 / 16);
                    propagateError(-1, 1, 3 / 16);
                    propagateError(0, 1, 5 / 16);
                    propagateError(1, 1, 1 / 16);
                } else if (ditheringMode === 'atkinson') {
                    // Atkinson: spreads only 3/4 of the error (each 1/8)
                    propagateError(1, 0, 1 / 8);
                    propagateError(2, 0, 1 / 8);
                    propagateError(-1, 1, 1 / 8);
                    propagateError(0, 1, 1 / 8);
                    propagateError(1, 1, 1 / 8);
                    propagateError(0, 2, 1 / 8);
                } else if (ditheringMode === 'bayer') {
                    // Bayer in hybrid mode — apply threshold offset to subject pixels
                    const threshold = BAYER_4X4[y % 4][x % 4] - 0.5;
                    const spread = 64;
                    const r = Math.max(0, Math.min(255, oldR + spread * threshold));
                    const g = Math.max(0, Math.min(255, oldG + spread * threshold));
                    const b = Math.max(0, Math.min(255, oldB + spread * threshold));
                    const bayerClosest = findClosestPaletteColor([r, g, b]);
                    data[i] = bayerClosest.rgb[0];
                    data[i + 1] = bayerClosest.rgb[1];
                    data[i + 2] = bayerClosest.rgb[2];
                    mosaicData[y][x] = { type: bayerClosest.type, color: bayerClosest.hex };
                    // Fix BOM: undo the previous count and add the correct one
                    bom[typeToKey[closest.type]]--;
                    bom[typeToKey[bayerClosest.type]]++;
                }
            }
        }
    }

    return {
        imageData: new ImageData(data, width, height),
        mosaicData,
        bom
    };
}
