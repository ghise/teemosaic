import type { DitheringMode } from './imageProcessing';

/**
 * Recommended settings produced by the image analyzer.
 */
export interface AnalysisResult {
    contrast: number;         // -100 to 100
    gamma: number;            // 0.2 to 5.0
    edgeStrength: number;     // 0 to 100
    posterizeLevels: number;  // 2 to 16
    useKMeans: boolean;
    ditheringMode: DitheringMode;
    hybridMode: boolean;
    bgThreshold: number;      // 1 to 50
    report: AnalysisReport;
}

export interface AnalysisReport {
    meanBrightness: number;
    stdDevBrightness: number;
    dynamicRange: number;
    edgeDensity: number;
    colorfulness: number;
    bgFlatPercent: number;     // % of pixels classified as flat background
    dominantTone: 'dark' | 'mid' | 'bright';
    suggestions: string[];
}

/**
 * Analyze an image and return optimal processing settings for the tee mosaic
 * pipeline.  All analysis is done on a down-sampled version of the source
 * image (at the grid resolution) so the recommendations match what the
 * processing pipeline will actually see.
 *
 * @param image       The original HTMLImageElement
 * @param gridWidth   Target mosaic grid width in tees
 */
export function analyzeImage(
    image: HTMLImageElement,
    gridWidth: number
): AnalysisResult {
    // ── 1. Down-sample to grid resolution ──────────────────────────────────
    const aspect = image.height / image.width;
    const gridHeight = Math.round(gridWidth * aspect);

    const canvas = document.createElement('canvas');
    canvas.width = gridWidth;
    canvas.height = gridHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0, gridWidth, gridHeight);
    const imgData = ctx.getImageData(0, 0, gridWidth, gridHeight);
    const data = imgData.data;
    const pixelCount = gridWidth * gridHeight;

    // ── 2. Luminance histogram & statistics ────────────────────────────────
    const histogram = new Float64Array(256);
    const luminances = new Float64Array(pixelCount);

    for (let i = 0; i < pixelCount; i++) {
        const idx = i * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        luminances[i] = lum;
        histogram[Math.min(255, Math.round(lum))]++;
    }

    // Mean brightness (0-255)
    let sumLum = 0;
    for (let i = 0; i < pixelCount; i++) sumLum += luminances[i];
    const meanBrightness = sumLum / pixelCount;

    // Standard deviation of brightness
    let variance = 0;
    for (let i = 0; i < pixelCount; i++) {
        const diff = luminances[i] - meanBrightness;
        variance += diff * diff;
    }
    const stdDevBrightness = Math.sqrt(variance / pixelCount);

    // Dynamic range (difference between 5th and 95th percentile)
    let count = 0;
    let p5 = 0, p95 = 255;
    for (let i = 0; i < 256; i++) {
        count += histogram[i];
        if (count >= pixelCount * 0.05 && p5 === 0) p5 = i;
        if (count >= pixelCount * 0.95) { p95 = i; break; }
    }
    const dynamicRange = p95 - p5;

    // Dominant tone
    const dominantTone: 'dark' | 'mid' | 'bright' =
        meanBrightness < 85 ? 'dark' :
            meanBrightness > 170 ? 'bright' : 'mid';

    // ── 3. Edge density (Sobel) ────────────────────────────────────────────
    const gray = luminances;
    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    let edgeSum = 0;
    let maxMag = 0;
    for (let y = 1; y < gridHeight - 1; y++) {
        for (let x = 1; x < gridWidth - 1; x++) {
            let sx = 0, sy = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const g = gray[(y + ky) * gridWidth + (x + kx)];
                    const ki = (ky + 1) * 3 + (kx + 1);
                    sx += g * gx[ki];
                    sy += g * gy[ki];
                }
            }
            const mag = Math.sqrt(sx * sx + sy * sy);
            edgeSum += mag;
            if (mag > maxMag) maxMag = mag;
        }
    }
    const interiorPixels = Math.max(1, (gridWidth - 2) * (gridHeight - 2));
    const edgeDensity = maxMag > 0 ? edgeSum / (interiorPixels * maxMag) : 0;

    // ── 4. Colorfulness metric ─────────────────────────────────────────────
    // Hasler & Süsstrunk colorfulness metric (simplified)
    let rg_sum = 0, yb_sum = 0, rg_sq = 0, yb_sq = 0;
    for (let i = 0; i < pixelCount; i++) {
        const idx = i * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const rg = r - g;
        const yb = 0.5 * (r + g) - b;
        rg_sum += rg;
        yb_sum += yb;
        rg_sq += rg * rg;
        yb_sq += yb * yb;
    }
    const rg_mean = rg_sum / pixelCount;
    const yb_mean = yb_sum / pixelCount;
    const rg_std = Math.sqrt(rg_sq / pixelCount - rg_mean * rg_mean);
    const yb_std = Math.sqrt(yb_sq / pixelCount - yb_mean * yb_mean);
    const colorfulness = Math.sqrt(rg_std * rg_std + yb_std * yb_std) +
        0.3 * Math.sqrt(rg_mean * rg_mean + yb_mean * yb_mean);

    // ── 5. Determine optimal settings ──────────────────────────────────────
    const suggestions: string[] = [];

    // ── Gamma ──
    // Goal: shift the mean brightness toward the middle (~128) for best
    // palette utilization. Very dark images need gamma > 1 (brighten),
    // very bright images need gamma < 1 (darken).
    let gamma: number;
    if (meanBrightness < 60) {
        gamma = 1.8;
        suggestions.push('Image is quite dark — boosting midtones with high gamma.');
    } else if (meanBrightness < 90) {
        gamma = 1.4;
        suggestions.push('Image is somewhat dark — brightening midtones.');
    } else if (meanBrightness > 200) {
        gamma = 0.6;
        suggestions.push('Image is very bright — darkening midtones.');
    } else if (meanBrightness > 170) {
        gamma = 0.8;
        suggestions.push('Image is somewhat bright — slightly darkening midtones.');
    } else {
        gamma = 1.0;
        suggestions.push('Brightness is well-balanced — no gamma correction needed.');
    }

    // ── Contrast ──
    // Low standard deviation = washed out / flat → boost contrast
    // High standard deviation = already punchy → reduce or leave
    let contrast: number;
    if (stdDevBrightness < 35) {
        contrast = 40;
        suggestions.push('Low contrast detected — boosting to enhance definition.');
    } else if (stdDevBrightness < 50) {
        contrast = 20;
        suggestions.push('Moderate contrast — applying a gentle boost.');
    } else if (stdDevBrightness > 80) {
        contrast = -15;
        suggestions.push('Very high contrast — reducing slightly to preserve detail.');
    } else {
        contrast = 0;
        suggestions.push('Contrast looks good — no adjustment needed.');
    }

    // ── Edge Strength ──
    // Low edge density = soft / blurry image → add edge enhancement
    // High edge density = already detailed → don't over-sharpen
    let edgeStrength: number;
    if (edgeDensity < 0.08) {
        edgeStrength = 30;
        suggestions.push('Few edges detected — adding edge enhancement for definition.');
    } else if (edgeDensity < 0.15) {
        edgeStrength = 15;
        suggestions.push('Moderate edge detail — slight edge enhancement applied.');
    } else {
        edgeStrength = 0;
        suggestions.push('Strong edges present — no additional edge enhancement needed.');
    }

    // ── Posterize Levels ──
    // Low dynamic range → fewer levels helps create cleaner regions
    // High dynamic range → more levels preserves tonal gradation
    let posterizeLevels: number;
    if (dynamicRange < 80) {
        posterizeLevels = 4;
        suggestions.push('Narrow tonal range — using fewer posterize levels for cleaner regions.');
    } else if (dynamicRange < 150) {
        posterizeLevels = 6;
        suggestions.push('Moderate tonal range — balanced posterization.');
    } else {
        posterizeLevels = 8;
        suggestions.push('Wide tonal range — using more posterize levels to preserve gradations.');
    }

    // ── Dithering Mode & K-Means ──
    // High colorfulness → K-Means helps group colors intelligently
    // Low colorfulness (near grayscale) → dithering works better
    let useKMeans: boolean;
    let ditheringMode: DitheringMode;

    if (colorfulness > 40) {
        // Colorful image → K-Means clusters colors well
        useKMeans = true;
        ditheringMode = 'floyd-steinberg';
        suggestions.push('Colorful image — using K-Means for optimal color grouping.');
    } else if (colorfulness > 20) {
        // Moderate color → K-Means with fallback to Floyd-Steinberg
        useKMeans = true;
        ditheringMode = 'floyd-steinberg';
        suggestions.push('Moderate color — K-Means with Floyd-Steinberg fallback.');
    } else {
        // Near grayscale → dithering is more effective
        useKMeans = false;
        ditheringMode = 'floyd-steinberg';
        suggestions.push('Low color saturation — using Floyd-Steinberg dithering for smooth gradients.');
    }

    // For very detailed images with lots of edges, Atkinson can be better
    // at preserving high-contrast details
    if (!useKMeans && edgeDensity > 0.2) {
        ditheringMode = 'atkinson';
        suggestions.push('High detail image — switched to Atkinson dithering for sharper edges.');
    }

    // ── Hybrid Mode Detection ──
    // Detect if the image has a significant flat/uniform background by
    // computing per-pixel local luminance variance in a 5×5 window and
    // checking what percentage of pixels are "flat" (low variance).
    const halfW = 2;
    const localSD = new Float32Array(pixelCount);
    let maxSD = 0;
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            let sum2 = 0, sumSq2 = 0, cnt = 0;
            for (let ky = -halfW; ky <= halfW; ky++) {
                for (let kx = -halfW; kx <= halfW; kx++) {
                    const ny = y + ky, nx = x + kx;
                    if (ny >= 0 && ny < gridHeight && nx >= 0 && nx < gridWidth) {
                        const v = luminances[ny * gridWidth + nx];
                        sum2 += v;
                        sumSq2 += v * v;
                        cnt++;
                    }
                }
            }
            const mean2 = sum2 / cnt;
            const sd = Math.sqrt(Math.max(0, sumSq2 / cnt - mean2 * mean2));
            localSD[y * gridWidth + x] = sd;
            if (sd > maxSD) maxSD = sd;
        }
    }

    // Count pixels with very low local variance (flat)
    const flatCutoff = maxSD > 0 ? 0.1 * maxSD : 0; // 10% of max as initial cutoff
    let flatCount = 0;
    for (let i = 0; i < pixelCount; i++) {
        if (localSD[i] < flatCutoff) flatCount++;
    }
    const bgFlatPercent = Math.round((flatCount / pixelCount) * 100);

    let hybridMode = false;
    let bgThreshold = 15;

    if (bgFlatPercent >= 20) {
        // At least 20% of the image is flat background → enable hybrid
        hybridMode = true;
        ditheringMode = 'floyd-steinberg';
        // Adjust threshold based on how much is flat
        if (bgFlatPercent >= 50) {
            bgThreshold = 10;
            suggestions.push(`Large flat background (${bgFlatPercent}%) detected — enabled Hybrid Dithering with low threshold for clean background.`);
        } else {
            bgThreshold = 18;
            suggestions.push(`Flat background (${bgFlatPercent}%) detected — enabled Hybrid Dithering to keep background solid while dithering subject.`);
        }
    } else {
        suggestions.push('No significant flat background detected — hybrid mode not needed.');
    }

    const report: AnalysisReport = {
        meanBrightness: Math.round(meanBrightness),
        stdDevBrightness: Math.round(stdDevBrightness * 10) / 10,
        dynamicRange,
        edgeDensity: Math.round(edgeDensity * 1000) / 1000,
        colorfulness: Math.round(colorfulness * 10) / 10,
        bgFlatPercent,
        dominantTone,
        suggestions,
    };

    return {
        contrast,
        gamma,
        edgeStrength,
        posterizeLevels,
        useKMeans,
        ditheringMode,
        hybridMode,
        bgThreshold,
        report,
    };
}
