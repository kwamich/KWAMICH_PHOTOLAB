import React from 'react';
import type { ActiveImage } from '../../types';
import type { CropRect } from '../../components/common/CropCanvas';
import { Crop, Sparkles, Check, Move } from 'lucide-react';

interface PhotoCropperToolProps {
  activeImage: ActiveImage;
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  cropRect?: CropRect | null;
  onApplyCropTrigger?: () => void;
}

export const PhotoCropperTool: React.FC<PhotoCropperToolProps> = ({
  activeImage,
  aspectRatio,
  onAspectRatioChange,
  cropRect,
}) => {
  const PRESETS = [
    { id: '1:1', label: '1:1 Square (Passport / Visa)', desc: 'Standard passport square photo' },
    { id: '35:45', label: '35:45 (Schengen & UK)', desc: 'European standard 35x45mm' },
    { id: '4:3', label: '4:3 Standard Photo', desc: 'Traditional camera frame' },
    { id: '16:9', label: '16:9 Widescreen', desc: 'Display & wallpaper format' },
    { id: 'free', label: 'Freeform Crop', desc: 'Custom unconstrained frame' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Crop className="w-5 h-5 text-blue-500" />
          <span>Interactive Visual Cropper</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Resize crop handles and use the attached zoom slider directly on the picture to eliminate unwanted areas.
        </p>
      </div>

      {/* Live Crop Selection Badge */}
      {cropRect && (
        <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-blue-500" />
              Active Selection Box:
            </span>
            <span className="font-extrabold text-blue-700 dark:text-blue-300 font-mono text-sm">
              {Math.round(cropRect.width)} × {Math.round(cropRect.height)} px
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Source Resolution: {activeImage.metadata.width} × {activeImage.metadata.height} px
          </p>
        </div>
      )}

      {/* Aspect Ratio Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Aspect Ratio Guides
        </label>
        <div className="space-y-2">
          {PRESETS.map((r) => (
            <button
              key={r.id}
              onClick={() => onAspectRatioChange(r.id)}
              className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                aspectRatio === r.id
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  {r.label}
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {r.desc}
                </span>
              </div>
              {aspectRatio === r.id && (
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Canvas Controls Tips */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
        <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Pro Crop Tips
        </span>
        <ul className="space-y-1.5 list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400">
          <li><strong>Attached Zoom Slider:</strong> Adjust the slider below the image to zoom in/out smoothly.</li>
          <li><strong>Drag Corners:</strong> Pull any corner bracket to resize the crop boundary.</li>
          <li><strong>Pan / Reposition:</strong> Click and drag inside or outside the frame to reposition the subject.</li>
          <li><strong>Rule-of-Thirds:</strong> Use the on-screen grid to perfectly align eyes and shoulders.</li>
        </ul>
      </div>
    </div>
  );
};
