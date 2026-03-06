'use client';

import { useState } from 'react';
import useMosaicStore from '@/store/useMosaicStore';
import type { DitheringMode } from '@/utils/imageProcessing';
import { Minus, Plus, Sparkles, ChevronDown, ChevronUp, Zap, Info, Layers } from 'lucide-react';

interface SliderRowProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    hint?: string;
    displayValue?: string;
}

function SliderRow({ label, value, min, max, step = 1, onChange, hint, displayValue }: SliderRowProps) {
    const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v * 1e6) / 1e6));

    return (
        <div className="space-y-2.5">
            <label className="text-sm font-semibold flex justify-between items-center">
                <span>{label}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{displayValue ?? value}</span>
            </label>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onChange(clamp(value - step))}
                    disabled={value <= min}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
                    aria-label={`Decrease ${label}`}
                >
                    <Minus size={14} strokeWidth={2.5} />
                </button>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="slider-control flex-1"
                />
                <button
                    onClick={() => onChange(clamp(value + step))}
                    disabled={value >= max}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
                    aria-label={`Increase ${label}`}
                >
                    <Plus size={14} strokeWidth={2.5} />
                </button>
            </div>
            {hint && <p className="text-xs text-neutral-500">{hint}</p>}
        </div>
    );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
                <label className="text-sm font-semibold">{label}</label>
                <p className="text-xs text-neutral-500">{hint}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${checked ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );
}

const DITHERING_OPTIONS: { value: DitheringMode; label: string; hint: string }[] = [
    { value: 'none', label: 'None', hint: 'Nearest color only' },
    { value: 'floyd-steinberg', label: 'Floyd-Steinberg', hint: 'Classic smooth gradients' },
    { value: 'atkinson', label: 'Atkinson', hint: 'Cleaner, preserves high-contrast detail' },
    { value: 'bayer', label: 'Bayer (Ordered)', hint: 'Retro cross-hatch pattern' },
];

function AnalysisReportPanel() {
    const { analysisReport, clearAnalysisReport } = useMosaicStore();
    const [expanded, setExpanded] = useState(false);

    if (!analysisReport) return null;

    const toneEmoji = analysisReport.dominantTone === 'dark' ? '🌑' :
        analysisReport.dominantTone === 'bright' ? '☀️' : '🌤️';

    return (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 overflow-hidden transition-all duration-300">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Analysis Report
                    </span>
                </div>
                {expanded ?
                    <ChevronUp size={14} className="text-emerald-500" /> :
                    <ChevronDown size={14} className="text-emerald-500" />
                }
            </button>

            {expanded && (
                <div className="px-3 pb-3 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/60 dark:bg-neutral-800/60 rounded-md p-2 text-center">
                            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Brightness</div>
                            <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{analysisReport.meanBrightness}/255</div>
                        </div>
                        <div className="bg-white/60 dark:bg-neutral-800/60 rounded-md p-2 text-center">
                            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Contrast</div>
                            <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{analysisReport.stdDevBrightness}</div>
                        </div>
                        <div className="bg-white/60 dark:bg-neutral-800/60 rounded-md p-2 text-center">
                            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Edge Detail</div>
                            <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{analysisReport.edgeDensity}</div>
                        </div>
                        <div className="bg-white/60 dark:bg-neutral-800/60 rounded-md p-2 text-center">
                            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Colorfulness</div>
                            <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{analysisReport.colorfulness}</div>
                        </div>
                        <div className="bg-white/60 dark:bg-neutral-800/60 rounded-md p-2 text-center">
                            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Dyn. Range</div>
                            <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{analysisReport.dynamicRange}</div>
                        </div>
                        <div className="bg-white/60 dark:bg-neutral-800/60 rounded-md p-2 text-center">
                            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Flat BG</div>
                            <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{analysisReport.bgFlatPercent}%</div>
                        </div>
                        <div className="bg-white/60 dark:bg-neutral-800/60 rounded-md p-2 text-center">
                            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Tone</div>
                            <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{toneEmoji} {analysisReport.dominantTone}</div>
                        </div>
                    </div>

                    {/* Suggestions */}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 uppercase tracking-wider font-medium">
                            <Info size={10} />
                            <span>Adjustments Made</span>
                        </div>
                        {analysisReport.suggestions.map((s, i) => (
                            <p key={i} className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-tight pl-3 border-l-2 border-emerald-300 dark:border-emerald-700">
                                {s}
                            </p>
                        ))}
                    </div>

                    <button
                        onClick={clearAnalysisReport}
                        className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    >
                        Dismiss report
                    </button>
                </div>
            )}
        </div>
    );
}

export default function ControlPanel() {
    const {
        originalImage,
        gridWidth, setGridWidth,
        contrast, setContrast,
        brightness, setBrightness,
        gamma, setGamma,
        edgeStrength, setEdgeStrength,
        posterizeLevels, setPosterizeLevels,
        useKMeans, setUseKMeans,
        ditheringMode, setDitheringMode,
        hybridMode, setHybridMode,
        bgThreshold, setBgThreshold,
        analyzeAndApply,
        analysisReport,
    } = useMosaicStore();

    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const isDefault =
        contrast === 0 &&
        brightness === 0 &&
        gamma === 1.0 &&
        edgeStrength === 0 &&
        posterizeLevels === 6 &&
        useKMeans === true &&
        ditheringMode === 'floyd-steinberg' &&
        hybridMode === false &&
        bgThreshold === 15;

    const handleReset = () => {
        setContrast(0);
        setBrightness(0);
        setGamma(1.0);
        setEdgeStrength(0);
        setPosterizeLevels(6);
        setUseKMeans(true);
        setDitheringMode('floyd-steinberg');
        setHybridMode(false);
        setBgThreshold(15);
    };

    const handleAutoOptimize = () => {
        if (!originalImage) return;
        setIsAnalyzing(true);
        // Small delay to let the UI show the analyzing state
        setTimeout(() => {
            analyzeAndApply();
            setIsAnalyzing(false);
        }, 100);
    };

    return (
        <div className="space-y-5">
            {/* Auto-Optimize button */}
            <button
                onClick={handleAutoOptimize}
                disabled={!originalImage || isAnalyzing}
                className="w-full group relative overflow-hidden py-2.5 px-4 rounded-xl font-semibold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.97] hover:shadow-lg hover:shadow-emerald-500/25"
                style={{
                    background: isAnalyzing
                        ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
                        : 'linear-gradient(135deg, #059669, #0d9488, #10b981)',
                }}
            >
                <span className="relative z-10 flex items-center justify-center gap-2">
                    <Sparkles
                        size={16}
                        className={isAnalyzing ? 'animate-spin' : 'group-hover:animate-pulse'}
                    />
                    {isAnalyzing ? 'Analyzing...' : 'Auto-Optimize'}
                </span>
                {/* Shimmer effect */}
                <span
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    aria-hidden
                />
            </button>

            {/* Analysis Report */}
            <AnalysisReportPanel />

            {!isDefault && (
                <button
                    onClick={handleReset}
                    className="w-full py-2 px-3 text-xs font-semibold uppercase tracking-wider rounded-lg border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors active:scale-[0.98]"
                >
                    Reset Filters
                </button>
            )}
            <SliderRow
                label="Grid Width (Tees)"
                value={gridWidth}
                min={10}
                max={300}
                onChange={setGridWidth}
                hint="Number of tees across the width of the board."
            />

            <SliderRow
                label="Contrast"
                value={contrast}
                min={-100}
                max={100}
                onChange={setContrast}
            />

            <SliderRow
                label="Brightness"
                value={brightness}
                min={-100}
                max={100}
                onChange={setBrightness}
                hint="Shifts overall lightness up or down"
            />

            <SliderRow
                label="Gamma (Midtones)"
                value={gamma}
                min={0.2}
                max={5.0}
                step={0.05}
                onChange={setGamma}
                displayValue={gamma.toFixed(2)}
                hint="< 1 darkens midtones, > 1 brightens midtones"
            />

            <SliderRow
                label="Edge Strength"
                value={edgeStrength}
                min={0}
                max={100}
                onChange={setEdgeStrength}
                hint="Enhances edges for sharper feature boundaries"
            />

            <SliderRow
                label="Posterize Levels"
                value={posterizeLevels}
                min={2}
                max={16}
                onChange={setPosterizeLevels}
                hint="Lower = fewer mid-tones, more defined regions"
            />

            <ToggleRow
                label="K-Means Color Mapping"
                hint={useKMeans ? "Smart palette assignment (bypasses dithering)" : "Uses K-Means to optimize color distribution"}
                checked={useKMeans}
                onChange={(v) => {
                    setUseKMeans(v);
                    // If enabling K-Means while hybrid is off, disable hybrid
                    // (K-Means alone already handles everything)
                }}
            />

            <div className="space-y-2.5 pt-2">
                <label className="text-sm font-semibold flex justify-between items-center">
                    <span>Dithering Mode</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                        {DITHERING_OPTIONS.find(o => o.value === ditheringMode)?.label}
                    </span>
                </label>
                <select
                    value={ditheringMode}
                    onChange={(e) => setDitheringMode(e.target.value as DitheringMode)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer"
                >
                    {DITHERING_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <p className="text-xs text-neutral-500">
                    {useKMeans && !hybridMode
                        ? 'Dithering is bypassed when K-Means is active (enable Hybrid Dithering to use both)'
                        : DITHERING_OPTIONS.find(o => o.value === ditheringMode)?.hint}
                </p>
            </div>

            {/* Hybrid Dithering Section */}
            <div className={`space-y-3 pt-2 pb-1 px-3 -mx-3 rounded-lg transition-colors duration-300 ${hybridMode ? 'bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30' : ''
                }`}>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <label className="text-sm font-semibold flex items-center gap-1.5">
                            <Layers size={14} className="text-amber-600 dark:text-amber-400" />
                            Hybrid Dithering
                        </label>
                        <p className="text-xs text-neutral-500">
                            {hybridMode
                                ? 'Dithers the subject, solid colors on the background'
                                : 'Apply dithering only to detailed areas'}
                        </p>
                    </div>
                    <button
                        onClick={() => setHybridMode(!hybridMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${hybridMode ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-600'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hybridMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>

                {hybridMode && (
                    <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                        <SliderRow
                            label="Background Threshold"
                            value={bgThreshold}
                            min={1}
                            max={50}
                            onChange={setBgThreshold}
                            hint="Lower = more area classified as background (solid). Higher = only the flattest areas are background."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

