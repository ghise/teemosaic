'use client';

import useMosaicStore from '@/store/useMosaicStore';
import { FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import type { TeeColor } from '@/utils/imageProcessing';

// Color mapping for PDF text — [R, G, B] 0-255
const TYPE_COLORS: Record<TeeColor, [number, number, number]> = {
    W: [160, 160, 160], // gray (white on white paper is invisible)
    K: [0, 0, 0],
    R: [220, 38, 38],
    G: [22, 163, 74],
    B: [37, 99, 235],
    Y: [180, 150, 0],   // darkened yellow so it's readable on white paper
};

const TYPE_LABELS: Record<TeeColor, string> = {
    W: 'White',
    K: 'Black',
    R: 'Red',
    G: 'Green',
    B: 'Blue',
    Y: 'Yellow',
};

// Page layout constants (letter size, inches)
const PAGE_W = 8.5;
const PAGE_H = 11;
const MARGIN = 0.5;
const USABLE_W = PAGE_W - MARGIN * 2;
const USABLE_H = PAGE_H - MARGIN * 2;

// Grid rendering constants
const FONT_SIZE = 7;            // pt
const CELL_W = 0.14;            // inches per character cell
const ROW_H = 0.14;             // inches per row
const HEADER_BLOCK_H = 0.9;     // space reserved for page header on grid pages
const ROW_NUM_W = 0.45;         // space for row numbers on the left
const COL_NUM_H = 0.25;         // space for column numbers on top

export default function ExportControls() {
    const { mosaicData, gridWidth, bom } = useMosaicStore();
    const hasData = mosaicData && mosaicData.length > 0;

    const handleExportPDF = () => {
        if (!mosaicData) return;

        const gridHeight = mosaicData.length;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'in',
            format: 'letter'
        });

        // ── Cover Page ──
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.text("TeeMosaic Blueprint", MARGIN, 1.2);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`Grid: ${gridWidth} × ${gridHeight}  (${(gridWidth * gridHeight).toLocaleString()} tees)`, MARGIN, 1.7);

        // BOM table
        let yBom = 2.3;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("Bill of Materials", MARGIN, yBom);
        yBom += 0.35;

        doc.setFontSize(10);
        const bomKeys: TeeColor[] = ['W', 'K', 'R', 'G', 'B', 'Y'];
        const totalTees = bomKeys.reduce((sum, k) => sum + bom[bomKeyMap(k)], 0);

        for (const key of bomKeys) {
            const count = bom[bomKeyMap(key)];
            if (count === 0) continue;
            const [r, g, b] = TYPE_COLORS[key];
            doc.setTextColor(r, g, b);
            doc.setFont("helvetica", "bold");
            doc.text(`■`, MARGIN, yBom);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0, 0, 0);
            doc.text(`${TYPE_LABELS[key]}:  ${count.toLocaleString()}`, MARGIN + 0.25, yBom);
            yBom += 0.28;
        }

        yBom += 0.15;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`Total:  ${totalTees.toLocaleString()}`, MARGIN, yBom);

        // Legend
        yBom += 0.6;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("Legend", MARGIN, yBom);
        yBom += 0.3;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        for (const key of bomKeys) {
            const [r, g, b] = TYPE_COLORS[key];
            doc.setTextColor(r, g, b);
            doc.setFont("courier", "bold");
            doc.text(key, MARGIN, yBom);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0, 0, 0);
            doc.text(`= ${TYPE_LABELS[key]} tee`, MARGIN + 0.25, yBom);
            yBom += 0.24;
        }

        // Page numbering info
        yBom += 0.5;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("Grid pages follow in reading order (left-to-right, top-to-bottom).", MARGIN, yBom);
        doc.text("Row and column numbers are printed on each page for alignment.", MARGIN, yBom + 0.22);

        // ── Calculate grid chunking ──
        const colsPerPage = Math.floor((USABLE_W - ROW_NUM_W) / CELL_W);
        const rowsPerPage = Math.floor((USABLE_H - HEADER_BLOCK_H - COL_NUM_H) / ROW_H);

        const colChunks = Math.ceil(gridWidth / colsPerPage);
        const rowChunks = Math.ceil(gridHeight / rowsPerPage);
        const totalGridPages = colChunks * rowChunks;

        let pageNum = 1;

        // ── Grid Pages ──
        for (let rowChunk = 0; rowChunk < rowChunks; rowChunk++) {
            for (let colChunk = 0; colChunk < colChunks; colChunk++) {
                doc.addPage();

                const startRow = rowChunk * rowsPerPage;
                const startCol = colChunk * colsPerPage;
                const endRow = Math.min(startRow + rowsPerPage, gridHeight);
                const endCol = Math.min(startCol + colsPerPage, gridWidth);

                // Page header
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.text(
                    `TeeMosaic Blueprint — Page ${pageNum} of ${totalGridPages}`,
                    MARGIN, MARGIN + 0.3
                );
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(
                    `Rows ${startRow + 1}–${endRow}  |  Columns ${startCol + 1}–${endCol}`,
                    MARGIN, MARGIN + 0.55
                );

                // Column numbers header
                const gridStartX = MARGIN + ROW_NUM_W;
                const gridStartY = MARGIN + HEADER_BLOCK_H;

                doc.setFont("courier", "normal");
                doc.setFontSize(5);
                doc.setTextColor(150, 150, 150);
                for (let c = startCol; c < endCol; c++) {
                    const x = gridStartX + (c - startCol) * CELL_W;
                    // Print column number vertically-ish (just the number)
                    const colLabel = String(c + 1);
                    doc.text(colLabel, x + CELL_W * 0.15, gridStartY - 0.05, { angle: 0 });
                }

                // Grid rows
                doc.setFont("courier", "bold");
                doc.setFontSize(FONT_SIZE);

                for (let r = startRow; r < endRow; r++) {
                    const y = gridStartY + COL_NUM_H + (r - startRow) * ROW_H;

                    // Row number
                    doc.setTextColor(150, 150, 150);
                    doc.setFont("courier", "normal");
                    doc.setFontSize(5);
                    doc.text(String(r + 1), MARGIN, y + 0.02);

                    // Tee letters
                    doc.setFont("courier", "bold");
                    doc.setFontSize(FONT_SIZE);

                    for (let c = startCol; c < endCol; c++) {
                        const tee = mosaicData[r][c];
                        const [tr, tg, tb] = TYPE_COLORS[tee.type];
                        doc.setTextColor(tr, tg, tb);
                        const x = gridStartX + (c - startCol) * CELL_W;
                        doc.text(tee.type, x, y);
                    }
                }

                // Light grid border
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.005);
                const totalW = (endCol - startCol) * CELL_W;
                const totalH = (endRow - startRow) * ROW_H;
                doc.rect(gridStartX, gridStartY + COL_NUM_H - 0.04, totalW, totalH + 0.04);

                pageNum++;
            }
        }

        doc.save("TeeMosaic_Blueprint.pdf");
    };

    return (
        <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center mb-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Export Blueprint</h2>
            </div>

            <button
                onClick={handleExportPDF}
                disabled={!hasData}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${hasData
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                    }`}
            >
                <FileText size={18} />
                Download PDF Guide
            </button>

            <p className="text-xs text-neutral-500 text-center">
                Generates a printable row-by-row assembly guide.
            </p>
        </div>
    );
}

// Helper to map TeeColor type code to BOM key
function bomKeyMap(type: TeeColor): 'white' | 'black' | 'red' | 'green' | 'blue' | 'yellow' {
    const map: Record<TeeColor, 'white' | 'black' | 'red' | 'green' | 'blue' | 'yellow'> = {
        W: 'white', K: 'black', R: 'red', G: 'green', B: 'blue', Y: 'yellow'
    };
    return map[type];
}
