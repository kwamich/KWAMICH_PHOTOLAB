import React, { useState, useEffect } from 'react';
import type { ActiveImage, CompressionConfig, OutputFormat } from '../../types';
import { imageCompressorService } from '../../services/imageCompressorService';
import { FileArchive, Target, Zap } from 'lucide-react';

interface ImageCompressorToolProps {
  activeImage: ActiveImage;
  onApplyCompression: (config: CompressionConfig, compressedBlob: Blob) => void;
}

export const ImageCompressorTool: React.FC<ImageCompressorToolProps> = ({
  activeImage,
  onApplyCompression
}) => {
  const [format, setFormat] = useState<OutputFormat>('jpg');
  const [quality, setQuality] = useState<number>(85);
  const [targetKb, setTargetKb] = useState<string>('');
  const [isTargetMode, setIsTargetMode] = useState<boolean>(false);
  const [estimatedSize, setEstimatedSize] = useState<number>(activeImage.metadata.sizeBytes);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  useEffect(() => {
    recalculateEstimate();
  }, [format, quality, targetKb, isTargetMode, activeImage]);

  const recalculateEstimate = async () => {
    setIsCalculating(true);
    const img = new Image();
    img.src = activeImage.objectUrl;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const targetBytes = isTargetMode && Number(targetKb) > 0 ? Number(targetKb) * 1024 : undefined;

    const { sizeBytes } = await imageCompressorService.compressCanvas(canvas, {
      format,
      quality,
      targetMaxSizeBytes: targetBytes
    });

    setEstimatedSize(sizeBytes);
    setIsCalculating(false);
  };

  const handlePresetSelect = (presetQuality: number) => {
    setIsTargetMode(false);
    setQuality(presetQuality);
  };

  const handleApply = async () => {
    const img = new Image();
    img.src = activeImage.objectUrl;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const targetBytes = isTargetMode && Number(targetKb) > 0 ? Number(targetKb) * 1024 : undefined;

    const { blob } = await imageCompressorService.compressCanvas(canvas, {
      format,
      quality,
      targetMaxSizeBytes: targetBytes
    });

    onApplyCompression({ format, quality, targetMaxSizeBytes: targetBytes }, blob);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>Image Compressor</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Reduce image file size or compress to a strict maximum file size limit.
        </p>
      </div>

      {/* Target Size vs Quality Mode Switcher */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <button
          onClick={() => setIsTargetMode(false)}
          className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            !isTargetMode
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Quality Slider</span>
        </button>

        <button
          onClick={() => setIsTargetMode(true)}
          className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            isTargetMode
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-amber-500" />
          <span>Target File Size</span>
        </button>
      </div>

      {/* Output Format Picker */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Export Format
        </label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {(['jpg', 'png', 'webp'] as OutputFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`py-2 rounded-xl border font-bold uppercase transition-all ${
                format === f
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {!isTargetMode ? (
        /* Quality Slider & Presets Mode */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Compression Quality:</span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{quality}%</span>
          </div>

          <input
            type="range"
            min={5}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          {/* Preset Buttons */}
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <button
              onClick={() => handlePresetSelect(95)}
              className="py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Max Quality (95%)
            </button>
            <button
              onClick={() => handlePresetSelect(80)}
              className="py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              High (80%)
            </button>
            <button
              onClick={() => handlePresetSelect(65)}
              className="py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Balanced (65%)
            </button>
            <button
              onClick={() => handlePresetSelect(45)}
              className="py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Small File (45%)
            </button>
            <button
              onClick={() => handlePresetSelect(25)}
              className="py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Compact (25%)
            </button>
            <button
              onClick={() => handlePresetSelect(15)}
              className="py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Max Compression
            </button>
          </div>
        </div>
      ) : (
        /* Target File Size Mode */
        <div className="space-y-3 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
          <label className="block text-xs font-bold text-amber-900 dark:text-amber-200">
            Maximum Target File Size (KB)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={targetKb}
              onChange={(e) => setTargetKb(e.target.value)}
              placeholder="e.g. 500 or 240"
              min={10}
              max={50000}
              className="flex-1 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100"
            />
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">KB</span>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[11px] pt-1">
            <button
              onClick={() => setTargetKb('240')}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-amber-300 text-amber-900 dark:text-amber-200 font-medium"
            >
              240 KB (US Passport)
            </button>
            <button
              onClick={() => setTargetKb('500')}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-amber-300 text-amber-900 dark:text-amber-200 font-medium"
            >
              500 KB (Upload Form)
            </button>
            <button
              onClick={() => setTargetKb('1000')}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-amber-300 text-amber-900 dark:text-amber-200 font-medium"
            >
              1 MB
            </button>
          </div>
        </div>
      )}

      {/* Live File Size Comparison Badge */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
          <span>Original File Size:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {imageCompressorService.formatFileSize(activeImage.metadata.sizeBytes)}
          </span>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
          <span className="font-bold text-slate-800 dark:text-slate-100">Estimated Compressed Size:</span>
          <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1.5">
            {isCalculating ? (
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              imageCompressorService.formatFileSize(estimatedSize)
            )}
          </span>
        </div>
      </div>

      {/* Apply Action */}
      <button
        onClick={handleApply}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <FileArchive className="w-4 h-4" />
        <span>Compress & Apply Result</span>
      </button>

    </div>
  );
};
