'use client';

import useMosaicStore from '@/store/useMosaicStore';
import { ShoppingCart } from 'lucide-react';

const TEE_ROWS: { key: 'white' | 'black' | 'red' | 'green' | 'blue' | 'yellow'; label: string; bg: string; border: string }[] = [
    { key: 'white', label: 'White', bg: 'bg-white', border: 'border-neutral-300' },
    { key: 'black', label: 'Black', bg: 'bg-black', border: 'border-neutral-600' },
    { key: 'red', label: 'Red', bg: 'bg-red-600', border: 'border-red-700' },
    { key: 'green', label: 'Green', bg: 'bg-green-600', border: 'border-green-700' },
    { key: 'blue', label: 'Blue', bg: 'bg-blue-600', border: 'border-blue-700' },
    { key: 'yellow', label: 'Yellow', bg: 'bg-yellow-400', border: 'border-yellow-500' },
];

export default function BillOfMaterials() {
    const { bom } = useMosaicStore();

    const totalTees = bom.white + bom.black + bom.red + bom.green + bom.blue + bom.yellow;

    if (totalTees === 0) return null;

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-700 p-5 w-64 lg:w-72 mt-8 lg:mt-0 flex-shrink-0">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-700">
                <ShoppingCart size={18} className="text-emerald-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">Bill of Materials</h2>
            </div>

            <div className="space-y-3">
                {TEE_ROWS.map(({ key, label, bg, border }) => (
                    <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full border ${border} ${bg}`} />
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">{label}</span>
                        </div>
                        <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">{bom[key].toLocaleString()}</span>
                    </div>
                ))}

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                    <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Total Tees</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{totalTees.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
