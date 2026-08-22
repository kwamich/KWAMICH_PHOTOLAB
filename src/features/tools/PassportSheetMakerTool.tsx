import React, { useState, useEffect } from 'react';
import type { ActiveImage, PassportPreset, SheetConfig } from '../../types';
import { PAPER_SIZES, PASSPORT_PRESETS } from '../../constants/passportPresets';
import { sheetMakerService, type GeneratedSheetResult } from '../../services/sheetMakerService';
import { Download, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PassportSheetMakerToolProps {
  activeImage: ActiveImage;
  activePreset?: PassportPreset;
}

export const PassportSheetMakerTool: React.FC<PassportSheetMakerToolProps> = ({
  activeImage,
  activePreset = PASSPORT_PRESETS[0]
}) => {
  const [paperSizeId, setPaperSizeId] = useState<string>('4x6');
  const [copyCount, setCopyCount] = useState<number>(6);
  const [spacingMm, setSpacingMm] = useState<number>(3);
  const [marginMm, setMarginMm] = useState<number>(6);
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);
  const [centerSheet, setCenterSheet] = useState<boolean>(true);

  const [sheetResult, setSheetResult] = useState<GeneratedSheetResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const currentPaper = PAPER_SIZES.find(p => p.id === paperSizeId) || PAPER_SIZES[0];

  useEffect(() => {
    generatePreview();
  }, [paperSizeId, copyCount, spacingMm, marginMm, showCropMarks, centerSheet, activeImage, activePreset]);

  const generatePreview = async () => {
    setIsGenerating(true);
    const img = new Image();
    img.src = activeImage.objectUrl;
    await img.decode();

    const photoCanvas = document.createElement('canvas');
    photoCanvas.width = img.naturalWidth || img.width;
    photoCanvas.height = img.naturalHeight || img.height;
    const ctx = photoCanvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const config: SheetConfig = {
      paperSizeId,
      copyCount,
      spacingMm,
      marginMm,
      showCropMarks,
      centerSheet
    };

    const result = await sheetMakerService.generateSheet(photoCanvas, activePreset, config);
    setSheetResult(result);
    setIsGenerating(false);
  };

  const handleDownloadJpg = () => {
    if (!sheetResult) return;
    const url = URL.createObjectURL(sheetResult.jpgBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KwamichPhotoLab_PassportSheet_${activePreset.id}_${paperSizeId}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
    triggerCelebration();
  };

  const handleDownloadPdf = () => {
    if (!sheetResult) return;
    const url = URL.createObjectURL(sheetResult.pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KwamichPhotoLab_PassportSheet_${activePreset.id}_${paperSizeId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    triggerCelebration();
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
          <span>Passport Print Sheet Maker</span>
          {isGenerating && (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          )}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Arrange multiple passport photos on standard print paper with crop marks and vector PDF export.
        </p>
      </div>

      {/* Preset Badge */}
      <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs flex items-center justify-between">
        <span className="text-slate-600 dark:text-slate-300 font-medium">Photo Preset:</span>
        <span className="font-bold text-blue-700 dark:text-blue-300">
          {activePreset.flag} {activePreset.name} ({activePreset.width}×{activePreset.height} {activePreset.unit})
        </span>
      </div>

      {/* Paper Size Picker */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Paper Size
        </label>
        <select
          value={paperSizeId}
          onChange={(e) => setPaperSizeId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          {PAPER_SIZES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Number of Copies Quick Selector */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Number of Copies:</span>
          <span className="font-extrabold text-blue-600 dark:text-blue-400">{copyCount} photos</span>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[2, 4, 6, 8, 12, 16, 20, 24].map((num) => (
            <button
              key={num}
              onClick={() => setCopyCount(num)}
              className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                copyCount === num
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Sheet Toggles & Spacing */}
      <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Draw Crop Marks / Cut Lines</span>
          <button
            onClick={() => setShowCropMarks(!showCropMarks)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              showCropMarks ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
              showCropMarks ? 'translate-x-5.5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Center Grid on Paper</span>
          <button
            onClick={() => setCenterSheet(!centerSheet)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              centerSheet ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
              centerSheet ? 'translate-x-5.5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Spacing Between Photos:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{spacingMm} mm</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            value={spacingMm}
            onChange={(e) => setSpacingMm(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Page Margin:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{marginMm} mm</span>
          </div>
          <input
            type="range"
            min={2}
            max={20}
            value={marginMm}
            onChange={(e) => setMarginMm(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>

      {/* Grid Specs calculated output */}
      {sheetResult && (
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
          <div className="flex justify-between font-semibold text-emerald-900 dark:text-emerald-200">
            <span>Optimal Grid Layout:</span>
            <span>{sheetResult.cols} columns × {sheetResult.rows} rows</span>
          </div>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
            Fits {sheetResult.totalCopiesOnPage} passport photos on a single {currentPaper.name} page.
          </p>
        </div>
      )}

      {/* Download Actions */}
      <div className="space-y-2 pt-2">
        <button
          onClick={handleDownloadPdf}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          <span>Download Print-Ready PDF</span>
        </button>

        <button
          onClick={handleDownloadJpg}
          className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download High-Res JPG Sheet</span>
        </button>
      </div>

    </div>
  );
};
