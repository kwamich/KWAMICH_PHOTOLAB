import React, { useState, useEffect } from 'react';
import { PASSPORT_PRESETS } from '../../constants/passportPresets';
import type { ActiveImage, FaceGuidanceResult, PassportPreset } from '../../types';
import { faceGuidanceService } from '../../services/faceGuidanceService';
import { CheckCircle2, AlertTriangle, ExternalLink, ShieldAlert, Sparkles } from 'lucide-react';

interface PassportPhotoToolProps {
  activeImage: ActiveImage;
  onApplyPreset: (preset: PassportPreset, croppedCanvas?: HTMLCanvasElement) => void;
  onNavigateToTool: (tool: string) => void;
}

export const PassportPhotoTool: React.FC<PassportPhotoToolProps> = ({
  activeImage,
  onApplyPreset,
  onNavigateToTool
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('us_passport');
  const [guidance, setGuidance] = useState<FaceGuidanceResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const selectedPreset = PASSPORT_PRESETS.find(p => p.id === selectedPresetId) || PASSPORT_PRESETS[0];

  useEffect(() => {
    runFaceAnalysis();
  }, [activeImage, selectedPresetId]);

  const runFaceAnalysis = async () => {
    setIsAnalyzing(true);
    const img = new Image();
    img.src = activeImage.objectUrl;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const result = await faceGuidanceService.analyzeFace(canvas, selectedPreset);
    setGuidance(result);
    setIsAnalyzing(false);
  };

  const handleApply = () => {
    onApplyPreset(selectedPreset);
  };

  return (
    <div className="space-y-6">
      
      {/* Header title */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>Passport & ID Photo Maker</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Select document requirements, verify face alignment, and crop to exact official dimensions.
        </p>
      </div>

      {/* Preset Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Select Document Preset
        </label>
        <select
          value={selectedPresetId}
          onChange={(e) => setSelectedPresetId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          {PASSPORT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.flag} {p.name} ({p.width}×{p.height} {p.unit})
            </option>
          ))}
        </select>
      </div>

      {/* Preset Specifications Card */}
      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-blue-950 dark:text-blue-200 flex items-center gap-2">
            <span>{selectedPreset.flag}</span>
            <span>{selectedPreset.name}</span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-semibold text-[11px]">
            {selectedPreset.dpi} DPI
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Physical Size</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {selectedPreset.width} × {selectedPreset.height} {selectedPreset.unit}
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Pixel Specs</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {selectedPreset.pixelWidth} × {selectedPreset.pixelHeight} px
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white/50 dark:bg-slate-800/40 p-2.5 rounded-xl">
          <strong className="text-slate-800 dark:text-slate-200">Notes:</strong> {selectedPreset.notes}
        </p>

        {selectedPreset.officialUrl && (
          <a
            href={selectedPreset.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline pt-1"
          >
            <span>Verify official government source</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Technical Photo Guidance */}
      <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Technical Photo Guidance</span>
          </h4>
          {isAnalyzing && (
            <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>

        {guidance && (
          <div className="space-y-2 text-xs">
            {guidance.warnings.map((w, idx) => (
              <div key={idx} className="flex items-start gap-2 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}

            {guidance.tips.map((t, idx) => (
              <div key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Official requirements disclaimer notice */}
      <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 p-3 rounded-xl bg-amber-50/50 dark:bg-slate-800/40 border border-amber-200/60 dark:border-slate-700">
        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p>
          Official requirements change periodically. Always verify current guidelines directly with the issuing government authority.
        </p>
      </div>

      {/* Apply Actions */}
      <div className="pt-2 space-y-2">
        <button
          onClick={handleApply}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Apply Preset Dimensions</span>
        </button>

        <button
          onClick={() => onNavigateToTool('sheet')}
          className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <span>Generate Print Sheet for this Preset</span>
        </button>
      </div>

    </div>
  );
};
