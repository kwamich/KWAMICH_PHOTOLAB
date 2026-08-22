import React, { useState, useEffect, useCallback } from 'react';
import type { ActiveImage, PhysicalUnit, ResizeConfig } from '../../types';
import type { TransformState } from '../../components/common/TransformCanvas';
import { dpiCalculator } from '../../services/dpiCalculator';
import { Lock, Unlock, Scaling, RotateCw, Move } from 'lucide-react';

interface ImageResizerToolProps {
  activeImage: ActiveImage;
  onApplyResize: (config: ResizeConfig, resizedCanvas: HTMLCanvasElement) => void;
  /** Current live transform from the interactive canvas */
  liveTransform?: TransformState | null;
  /** Push changes back to the canvas when user types in the inspector */
  onInspectorChange?: (partial: Partial<TransformState>) => void;
}

export const ImageResizerTool: React.FC<ImageResizerToolProps> = ({
  activeImage,
  onApplyResize,
  liveTransform,
  onInspectorChange,
}) => {
  const [unit, setUnit] = useState<PhysicalUnit>('px');
  const [dpi, setDpi] = useState<number>(300);
  const [width, setWidth] = useState<number>(activeImage.metadata.width);
  const [height, setHeight] = useState<number>(activeImage.metadata.height);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [fitMode, setFitMode] = useState<'fit' | 'fill' | 'stretch'>('fit');
  const [rotation, setRotation] = useState<number>(0);

  const origAspect = activeImage.metadata.aspectRatio;

  // ── Sync width/height from live canvas transform ───────────────────────────
  useEffect(() => {
    if (!liveTransform) return;
    // Convert canvas display px to current unit using the scale ratio
    const scaleX = activeImage.metadata.width / liveTransform.width;
    const scaleY = activeImage.metadata.height / liveTransform.height;
    const natW = liveTransform.width * scaleX;   // always in natural px
    const natH = liveTransform.height * scaleY;

    const dispW = dpiCalculator.pixelsToPhysical(Math.round(natW), unit, dpi);
    const dispH = dpiCalculator.pixelsToPhysical(Math.round(natH), unit, dpi);
    setWidth(Number(dispW.toFixed(2)));
    setHeight(Number(dispH.toFixed(2)));
    setRotation(Number(liveTransform.rotation.toFixed(1)));
  }, [liveTransform, unit, dpi, activeImage.metadata.width, activeImage.metadata.height]);

  // ── Push inspector changes to canvas ────────────────────────────────────────
  const pushToCanvas = useCallback((w: number, h: number, rot: number) => {
    if (!onInspectorChange) return;
    // We need to convert our physical-unit w/h to display-px for the canvas
    const pxW = dpiCalculator.physicalToPixels(w, unit, dpi);
    const pxH = dpiCalculator.physicalToPixels(h, unit, dpi);

    // The canvas displays scaled. We need to figure out the display scale.
    // The TransformCanvas auto-fit the image. We mimic the same ratio.
    if (liveTransform) {
      const curScaleX = activeImage.metadata.width / liveTransform.width;
      const newDispW = pxW / curScaleX;
      const newDispH = pxH / (activeImage.metadata.height / liveTransform.height);
      onInspectorChange({ width: newDispW, height: newDispH, rotation: rot });
    }
  }, [onInspectorChange, unit, dpi, liveTransform, activeImage.metadata.width, activeImage.metadata.height]);

  // ── Unit switching with value conversion ────────────────────────────────────
  const handleUnitChange = (newUnit: PhysicalUnit) => {
    const pxW = dpiCalculator.physicalToPixels(width, unit, dpi);
    const pxH = dpiCalculator.physicalToPixels(height, unit, dpi);
    setUnit(newUnit);
    setWidth(Number(dpiCalculator.pixelsToPhysical(pxW, newUnit, dpi).toFixed(2)));
    setHeight(Number(dpiCalculator.pixelsToPhysical(pxH, newUnit, dpi).toFixed(2)));
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (maintainAspect && origAspect > 0) {
      const newH = Number((val / origAspect).toFixed(2));
      setHeight(newH);
      pushToCanvas(val, newH, rotation);
    } else {
      pushToCanvas(val, height, rotation);
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (maintainAspect && origAspect > 0) {
      const newW = Number((val * origAspect).toFixed(2));
      setWidth(newW);
      pushToCanvas(newW, val, rotation);
    } else {
      pushToCanvas(width, val, rotation);
    }
  };

  const handleRotationChange = (val: number) => {
    setRotation(val);
    pushToCanvas(width, height, val);
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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Apply rotation
    ctx.save();
    ctx.translate(calculatedPxW / 2, calculatedPxH / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    if (fitMode === 'stretch') {
      ctx.drawImage(img, -calculatedPxW / 2, -calculatedPxH / 2, calculatedPxW, calculatedPxH);
    } else if (fitMode === 'fit') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-calculatedPxW / 2, -calculatedPxH / 2, calculatedPxW, calculatedPxH);
      const scale = Math.min(calculatedPxW / img.naturalWidth, calculatedPxH / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      const scale = Math.max(calculatedPxW / img.naturalWidth, calculatedPxH / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    }
    ctx.restore();

    onApplyResize({ unit, width, height, dpi, maintainAspectRatio: maintainAspect, fitMode }, canvas);
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Scaling className="w-5 h-5 text-blue-500" />
          <span>Transform &amp; Resize</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Drag handles on the canvas or type exact values below.
        </p>
      </div>

      {/* Live Transform Readout */}
      {liveTransform && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wider">
            <Move className="w-3 h-3" />
            Live Canvas Transform
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Width</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{Math.round(liveTransform.width)}</span>
            </div>
            <div className="text-center">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Height</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{Math.round(liveTransform.height)}</span>
            </div>
            <div className="text-center">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Rotation</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{liveTransform.rotation.toFixed(1)}°</span>
            </div>
          </div>
        </div>
      )}

      {/* Unit Selection Tabs */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Output Unit
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

      {/* Rotation Field */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <RotateCw className="w-3.5 h-3.5 text-indigo-500" />
          Rotation (degrees)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotation}
            onChange={(e) => handleRotationChange(Number(e.target.value))}
            className="flex-1 accent-indigo-600 cursor-pointer"
          />
          <input
            type="number"
            value={rotation}
            onChange={(e) => handleRotationChange(Number(e.target.value))}
            step={1}
            className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 pt-1">
          {[0, 90, 180, -90].map((deg) => (
            <button
              key={deg}
              onClick={() => handleRotationChange(deg)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all border ${
                rotation === deg
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio Lock & DPI */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setMaintainAspect(!maintainAspect)}
          className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
            maintainAspect ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {maintainAspect ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          <span>Lock Aspect</span>
        </button>

        {unit !== 'px' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">DPI:</span>
            <select
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value={72}>72 (Web)</option>
              <option value={150}>150 (Draft)</option>
              <option value={300}>300 (Print)</option>
              <option value={600}>600 (HiRes)</option>
            </select>
          </div>
        )}
      </div>

      {/* Fit mode */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Resize Mode
        </label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {(['fit', 'fill', 'stretch'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFitMode(mode)}
              className={`p-2.5 rounded-xl border text-center font-medium transition-all capitalize ${
                fitMode === mode
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {mode === 'fit' ? 'Fit Inside' : mode === 'fill' ? 'Crop to Fill' : 'Stretch'}
            </button>
          ))}
        </div>
      </div>

      {/* Calculated Output */}
      <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs flex items-center justify-between">
        <span className="text-slate-600 dark:text-slate-300 font-medium">Final Output:</span>
        <span className="font-extrabold text-blue-700 dark:text-blue-300 text-sm">
          {calculatedPxW} × {calculatedPxH} px
        </span>
      </div>

      {/* Apply Action */}
      <button
        onClick={handleApply}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all flex items-center justify-center gap-2"
      >
        <Scaling className="w-4 h-4" />
        <span>Apply Resize &amp; Export</span>
      </button>

    </div>
  );
};
