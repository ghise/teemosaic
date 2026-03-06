import { create } from 'zustand';
import type { TeeColor, BOM, DitheringMode } from '@/utils/imageProcessing';
import { analyzeImage, type AnalysisReport } from '@/utils/analyzeImage';

interface MosaicState {
    originalImage: HTMLImageElement | null;
    setOriginalImage: (image: HTMLImageElement | null) => void;

    gridWidth: number;
    setGridWidth: (width: number) => void;

    contrast: number;
    setContrast: (contrast: number) => void;

    brightness: number;
    setBrightness: (brightness: number) => void;

    gamma: number;
    setGamma: (gamma: number) => void;

    edgeStrength: number;
    setEdgeStrength: (strength: number) => void;

    posterizeLevels: number;
    setPosterizeLevels: (levels: number) => void;

    useKMeans: boolean;
    setUseKMeans: (use: boolean) => void;

    ditheringMode: DitheringMode;
    setDitheringMode: (mode: DitheringMode) => void;

    hybridMode: boolean;
    setHybridMode: (hybrid: boolean) => void;

    bgThreshold: number;
    setBgThreshold: (threshold: number) => void;

    teeDiameter: number;
    setTeeDiameter: (diameter: number) => void;

    teeSpacing: number;
    setTeeSpacing: (spacing: number) => void;

    bom: BOM;
    setBom: (bom: BOM) => void;

    mosaicData: { type: TeeColor, color: string }[][] | null;
    setMosaicData: (data: { type: TeeColor, color: string }[][] | null) => void;

    analysisReport: AnalysisReport | null;
    analyzeAndApply: () => void;
    clearAnalysisReport: () => void;
}

const useMosaicStore = create<MosaicState>((set, get) => ({
    originalImage: null,
    setOriginalImage: (image) => set({ originalImage: image, analysisReport: null }),

    gridWidth: 100,
    setGridWidth: (gridWidth) => set({ gridWidth }),

    contrast: 0,
    setContrast: (contrast) => set({ contrast }),

    brightness: 0,
    setBrightness: (brightness) => set({ brightness }),

    gamma: 1.0,
    setGamma: (gamma) => set({ gamma }),

    edgeStrength: 0,
    setEdgeStrength: (edgeStrength) => set({ edgeStrength }),

    posterizeLevels: 6,
    setPosterizeLevels: (posterizeLevels) => set({ posterizeLevels }),

    useKMeans: true,
    setUseKMeans: (useKMeans) => set({ useKMeans }),

    ditheringMode: 'floyd-steinberg' as DitheringMode,
    setDitheringMode: (ditheringMode) => set({ ditheringMode }),

    hybridMode: false,
    setHybridMode: (hybridMode) => set({ hybridMode }),

    bgThreshold: 15,
    setBgThreshold: (bgThreshold) => set({ bgThreshold }),

    teeDiameter: 0.45,
    setTeeDiameter: (teeDiameter) => set({ teeDiameter }),

    teeSpacing: 0.1,
    setTeeSpacing: (teeSpacing) => set({ teeSpacing }),

    bom: { white: 0, black: 0, red: 0, green: 0, blue: 0, yellow: 0 },
    setBom: (bom) => set({ bom }),

    mosaicData: null,
    setMosaicData: (mosaicData) => set({ mosaicData }),

    analysisReport: null,
    analyzeAndApply: () => {
        const { originalImage, gridWidth } = get();
        if (!originalImage) return;

        const result = analyzeImage(originalImage, gridWidth);

        set({
            contrast: result.contrast,
            brightness: result.brightness ?? 0,
            gamma: result.gamma,
            edgeStrength: result.edgeStrength,
            posterizeLevels: result.posterizeLevels,
            useKMeans: result.useKMeans,
            ditheringMode: result.ditheringMode,
            hybridMode: result.hybridMode,
            bgThreshold: result.bgThreshold,
            analysisReport: result.report,
        });
    },
    clearAnalysisReport: () => set({ analysisReport: null }),
}));

export default useMosaicStore;
