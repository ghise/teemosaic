'use client';

import useMosaicStore from '@/store/useMosaicStore';

export default function PhysicalCalculator() {
    const { teeDiameter, setTeeDiameter, teeSpacing, setTeeSpacing, gridWidth, mosaicData } = useMosaicStore();

    const gridHeight = mosaicData ? mosaicData.length : 0;

    // Math: Size = Count * (Diameter + Spacing)
    const physicalWidthInches = gridWidth * (teeDiameter + teeSpacing);
    const physicalHeightInches = gridHeight * (teeDiameter + teeSpacing);

    const physicalWidthCm = physicalWidthInches * 2.54;
    const physicalHeightCm = physicalHeightInches * 2.54;

    return (
        <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center mb-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Physical Size Calculator</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Tee Diameter (in)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={teeDiameter}
                        onChange={(e) => setTeeDiameter(Number(e.target.value))}
                        className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Hole Spacing (in)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={teeSpacing}
                        onChange={(e) => setTeeSpacing(Number(e.target.value))}
                        className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-4">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 uppercase tracking-wide">Board Dimensions</div>
                {gridHeight > 0 ? (
                    <div className="space-y-1">
                        <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 flex items-end gap-1">
                            {physicalWidthInches.toFixed(1)}&quot; <span className="text-sm font-normal text-emerald-600 dark:text-emerald-400">×</span> {physicalHeightInches.toFixed(1)}&quot;
                        </div>
                        <div className="text-sm text-emerald-600/80 dark:text-emerald-400/80 font-mono">
                            ({physicalWidthCm.toFixed(1)} cm × {physicalHeightCm.toFixed(1)} cm)
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-emerald-600/70 dark:text-emerald-500">Upload image to calculate</div>
                )}
            </div>
        </div>
    );
}
