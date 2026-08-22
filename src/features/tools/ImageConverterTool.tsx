import React, { useState } from 'react';
import type { ActiveImage, OutputFormat } from '../../types';
import { AlertCircle, ArrowRightLeft } from 'lucide-react';
import { imageCompressorService } from '../../services/imageCompressorService';

interface ImageConverterToolProps {
  activeImage: ActiveImage;
  onApplyConversion: (convertedBlob: Blob, newFormat: OutputFormat) => void;
}

export const ImageConverterTool: React.FC<ImageConverterToolProps> = ({
  activeImage,
  onApplyConversion
}) => {
  const [targetFormat, setTargetFormat] = useState<OutputFormat>('jpg');
  const [bgColorHex, setBgColorHex] = useState<string>('#FFFFFF');

  const isCurrentTransparent = activeImage.metadata.type.includes('png') || activeImage.metadata.type.includes('webp');
  const showTransparencyWarning = isCurrentTransparent && targetFormat === 'jpg';

  const handleConvert = async () => {
    const img = new Image();
    img.src = activeImage.objectUrl;
    await img.decode();

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    if (targetFormat === 'jpg') {
      ctx.fillStyle = bgColorHex;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0);

    const { blob } = await imageCompressorService.compressCanvas(canvas, {
      format: targetFormat,
      quality: 95
    });

    onApplyConversion(blob, targetFormat);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>Image Format Converter</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Convert seamlessly between JPG, PNG, and WebP formats.
        </p>
      </div>

      {/* Current File Info */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
        <div className="flex justify-between text-slate-600 dark:text-slate-400">
          <span>Current Format:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{activeImage.metadata.type.replace('image/', '')}</span>
        </div>
        <div className="flex justify-between text-slate-600 dark:text-slate-400">
          <span>File Size:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {imageCompressorService.formatFileSize(activeImage.metadata.sizeBytes)}
          </span>
        </div>
      </div>

      {/* Target Format Picker */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Convert To
        </label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {(['jpg', 'png', 'webp'] as OutputFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setTargetFormat(f)}
              className={`py-3 rounded-xl border font-bold uppercase transition-all flex flex-col items-center gap-1 ${
                targetFormat === f
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-sm">{f}</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-normal">
                {f === 'jpg' ? 'Standard Print' : f === 'png' ? 'Transparency' : 'Web Optimized'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Transparency Warning & Background Fill */}
      {showTransparencyWarning && (
        <div className="space-y-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs">
          <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              JPG format does not support transparency. Select a background color to fill transparent areas.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-amber-900 dark:text-amber-200 font-semibold">Background Fill:</span>
            <input
              type="color"
              value={bgColorHex}
              onChange={(e) => setBgColorHex(e.target.value)}
              className="w-7 h-7 rounded-md cursor-pointer border-0 p-0"
            />
            <span className="font-mono text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase">{bgColorHex}</span>
          </div>
        </div>
      )}

      {/* Apply Action */}
      <button
        onClick={handleConvert}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <ArrowRightLeft className="w-4 h-4" />
        <span>Convert to {targetFormat.toUpperCase()}</span>
      </button>

    </div>
  );
};
