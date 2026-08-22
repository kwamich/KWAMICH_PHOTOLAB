import React, { useState } from 'react';
import type { ActiveImage } from '../../types';
import { Crop, RotateCw, RefreshCcw } from 'lucide-react';

interface PhotoCropperToolProps {
  activeImage: ActiveImage;
  onApplyCrop: (croppedCanvas: HTMLCanvasElement) => void;
}

export const PhotoCropperTool: React.FC<PhotoCropperToolProps> = ({
  activeImage,
  onApplyCrop
}) => {
  const [aspectRatio, setAspectRatio] = useState<string>('1:1'); // 'free', '1:1', '3:4', '4:3', '16:9', '35:45'
  const [rotation, setRotation] = useState<number>(0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  const handleReset = () => {
    setRotation(0);
    setPanX(0);
    setPanY(0);
  };

  const handleApply = async () => {
    const img = new Image();
    img.src = activeImage.objectUrl;
    await img.decode();

    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    // Calculate crop bounds based on aspect ratio preset
    let targetW = origW;
    let targetH = origH;

    if (aspectRatio === '1:1') {
      const minDim = Math.min(origW, origH);
      targetW = minDim;
      targetH = minDim;
    } else if (aspectRatio === '35:45') {
      if (origW / origH > 35 / 45) {
        targetH = origH;
        targetW = Math.round(origH * (35 / 45));
      } else {
        targetW = origW;
        targetH = Math.round(origW * (45 / 35));
      }
    } else if (aspectRatio === '4:3') {
      targetH = Math.round(origW * (3 / 4));
      if (targetH > origH) {
        targetH = origH;
        targetW = Math.round(origH * (4 / 3));
      }
    } else if (aspectRatio === '16:9') {
      targetH = Math.round(origW * (9 / 16));
      if (targetH > origH) {
        targetH = origH;
        targetW = Math.round(origH * (16 / 9));
      }
    }

    const cropX = Math.max(0, Math.round((origW - targetW) / 2 + (panX * origW / 100)));
    const cropY = Math.max(0, Math.round((origH - targetH) / 2 + (panY * origH / 100)));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;

    // High quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (rotation !== 0) {
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
    } else {
      ctx.drawImage(img, cropX, cropY, targetW, targetH, 0, 0, targetW, targetH);
    }

    onApplyCrop(canvas);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>Photo Cropper & Frame Alignment</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Crop image to exact aspect ratio guides for passports and digital forms.
        </p>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Aspect Ratio Presets
        </label>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { id: '1:1', label: '1:1 Square (Passport)' },
            { id: '35:45', label: '35:45 (EU Passport)' },
            { id: '4:3', label: '4:3 Standard' },
            { id: '16:9', label: '16:9 Widescreen' },
            { id: 'free', label: 'Original Ratio' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setAspectRatio(r.id)}
              className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                aspectRatio === r.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rotation & Zoom Controls */}
      <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        
        {/* Rotation */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Rotation:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{rotation}°</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={-180}
              max={180}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Pan */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Horizontal Shift:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{panX}%</span>
          </div>
          <input
            type="range"
            min={-30}
            max={30}
            value={panX}
            onChange={(e) => setPanX(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Vertical Pan */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Vertical Shift:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{panY}%</span>
          </div>
          <input
            type="range"
            min={-30}
            max={30}
            value={panY}
            onChange={(e) => setPanY(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <button
          onClick={handleReset}
          className="w-full py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>Reset Alignments</span>
        </button>

      </div>

      {/* Apply Action */}
      <button
        onClick={handleApply}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <Crop className="w-4 h-4" />
        <span>Apply Crop & Positioning</span>
      </button>

    </div>
  );
};
