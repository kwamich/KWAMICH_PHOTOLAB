import React, { useState } from 'react';
import type { ActiveImage, PhysicalUnit, ResizeConfig } from '../../types';
import { dpiCalculator } from '../../services/dpiCalculator';
import { Lock, Unlock, Scaling } from 'lucide-react';

interface ImageResizerToolProps {
  activeImage: ActiveImage;
  onApplyResize: (config: ResizeConfig, resizedCanvas: HTMLCanvasElement) => void;
}

export const ImageResizerTool: React.FC<ImageResizerToolProps> = ({
  activeImage,
  onApplyResize
}) => {
  const [unit, setUnit] = useState<PhysicalUnit>('px');
  const [dpi, setDpi] = useState<number>(300);
  const [width, setWidth] = useState<number>(activeImage.metadata.width);
  const [height, setHeight] = useState<number>(activeImage.metadata.height);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [fitMode, setFitMode] = useState<'fit' | 'fill' | 'stretch'>('fit');

  const origAspect = activeImage.metadata.aspectRatio;

  // Handle unit switch and convert values dynamically
  const handleUnitChange = (newUnit: PhysicalUnit) => {
    const pxW = dpiCalculator.physicalToPixels(width, unit, dpi);
    const pxH = dpiCalculator.physicalToPixels(height, unit, dpi);

    setUnit(newUnit);
    setWidth(dpiCalculator.pixelsToPhysical(pxW, newUnit, dpi));
    setHeight(dpiCalculator.pixelsToPhysical(pxH, newUnit, dpi));
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (maintainAspect && origAspect > 0) {
      setHeight(Number((val / origAspect).toFixed(2)));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (maintainAspect && origAspect > 0) {
      setWidth(Number((val * origAspect).toFixed(2)));
    }
  };

  // Calculate live output pixel dimensions
  const calculatedPxW = dpiCalculator.physicalToPixels(width, unit, dpi);
  const calculatedPxH = dpiCalculator.physicalToPixels(height, unit, dpi);

  const handleApply = async () => {
    const img = new Image();
    img.src = activeImage.objectUrl;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = calculatedPxW;
    canvas.height = calculatedPxH;
    const ctx = canvas.getContext('2d')!;

    // High quality interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (fitMode === 'stretch') {
      ctx.drawImage(img, 0, 0, calculatedPxW, calculatedPxH);
    } else if (fitMode === 'fit') {
      // Fit inside canvas while preserving aspect ratio and adding white padding if needed
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, calculatedPxW, calculatedPxH);

      const scale = Math.min(calculatedPxW / img.naturalWidth, calculatedPxH / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const x = (calculatedPxW - drawW) / 2;
      const y = (calculatedPxH - drawH) / 2;

      ctx.drawImage(img, x, y, drawW, drawH);
    } else {
      // Fill / Crop to fit center
      const scale = Math.max(calculatedPxW / img.naturalWidth, calculatedPxH / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const x = (calculatedPxW - drawW) / 2;
      const y = (calculatedPxH - drawH) / 2;

      ctx.drawImage(img, x, y, drawW, drawH);
    }

    onApplyResize({ unit, width, height, dpi, maintainAspectRatio: maintainAspect, fitMode }, canvas);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>Custom Image Resizer</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Resize by exact pixels or physical print units (inches, cm, mm) and DPI.
        </p>
      </div>

      {/* Unit Selection Tabs */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Dimension Unit
        </label>
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {(['px', 'in', 'cm', 'mm'] as PhysicalUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => handleUnitChange(u)}
              className={`py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                unit === u
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Width & Height Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Width ({unit})
          </label>
          <input
            type="number"
            value={width}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            min={1}
            step={unit === 'px' ? 1 : 0.01}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Height ({unit})
          </label>
          <input
            type="number"
            value={height}
            onChange={(e) => handleHeightChange(Number(e.target.value))}
            min={1}
            step={unit === 'px' ? 1 : 0.01}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Aspect ratio lock & DPI */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setMaintainAspect(!maintainAspect)}
          className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
            maintainAspect ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {maintainAspect ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          <span>Maintain Aspect Ratio</span>
        </button>

        {unit !== 'px' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">DPI:</span>
            <select
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value={72}>72 DPI (Web)</option>
              <option value={150}>150 DPI (Draft Print)</option>
              <option value={300}>300 DPI (Standard Print)</option>
              <option value={600}>600 DPI (High Res)</option>
            </select>
          </div>
        )}
      </div>

      {/* Fit mode selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Resize Mode
        </label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <button
            onClick={() => setFitMode('fit')}
            className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
              fitMode === 'fit'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            Fit Inside
          </button>
          <button
            onClick={() => setFitMode('fill')}
            className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
              fitMode === 'fill'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            Crop to Fill
          </button>
          <button
            onClick={() => setFitMode('stretch')}
            className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
              fitMode === 'stretch'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            Stretch
          </button>
        </div>
      </div>

      {/* Real-time Calculated Output Pixel Specs */}
      <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs flex items-center justify-between">
        <span className="text-slate-600 dark:text-slate-300 font-medium">Calculated Output:</span>
        <span className="font-extrabold text-blue-700 dark:text-blue-300 text-sm">
          {calculatedPxW} × {calculatedPxH} px
        </span>
      </div>

      {/* Apply Action */}
      <button
        onClick={handleApply}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <Scaling className="w-4 h-4" />
        <span>Apply New Dimensions</span>
      </button>

    </div>
  );
};
