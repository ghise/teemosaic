'use client';

import { Upload } from 'lucide-react';
import ImageUploader from '@/components/ImageUploader';
import ControlPanel from '@/components/ControlPanel';
import PhysicalCalculator from '@/components/PhysicalCalculator';
import BillOfMaterials from '@/components/BillOfMaterials';
import ExportControls from '@/components/ExportControls';
import CanvasPreview from '@/components/CanvasPreview';
import useMosaicStore from '@/store/useMosaicStore';

export default function Home() {
  const { originalImage, setOriginalImage } = useMosaicStore();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans">
      <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
          <span>⛳</span> TeeMosaic
        </h1>
        <div className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
          Golf Tee Mosaic Generator
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-full lg:w-80 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-y-auto flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-[5]">
          <div className="p-5 space-y-6">
            {!originalImage ? (
              <ImageUploader onUpload={setOriginalImage} />
            ) : (
              <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Settings</h2>
                  <button
                    onClick={() => setOriginalImage(null)}
                    className="text-xs text-rose-500 hover:text-rose-600 font-medium transition-colors"
                  >
                    New Image
                  </button>
                </div>

                <ControlPanel />

                <div className="h-px bg-neutral-200 dark:bg-neutral-700 w-full rounded-full" />

                <PhysicalCalculator />

                <div className="h-px bg-neutral-200 dark:bg-neutral-700 w-full rounded-full" />

                <ExportControls />
              </div>
            )}
          </div>
        </aside>

        {/* Main Canvas Area */}
        <section className="flex-1 bg-neutral-100 dark:bg-neutral-900 p-4 lg:p-8 flex flex-col items-center overflow-auto relative shadow-inner">
          {!originalImage ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 space-y-4 animate-pulse">
              <Upload size={48} className="opacity-20" />
              <p className="text-lg font-medium opacity-50">Upload an image to get started</p>
            </div>
          ) : (
            <div className="w-full h-full flex gap-6">
              <div className="flex-1 flex flex-col items-center min-h-[500px] w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-4 lg:p-6 transition-all duration-300 hover:shadow-2xl">
                <CanvasPreview />
              </div>
              <div className="w-64 max-h-[600px] sticky top-8">
                <BillOfMaterials />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
