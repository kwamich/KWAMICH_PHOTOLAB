import React, { useState, useRef } from 'react';
import {
  PRESET_BACKGROUND_COLORS,
  backgroundRemoverService,
  type ReplacementBackground,
} from '../../services/backgroundRemoverService';
import type { ActiveImage, ProcessingStatus } from '../../types';
import { Wand2, RefreshCw, Palette, SlidersHorizontal, Check, Layers } from 'lucide-react';

interface BackgroundRemoverToolProps {
  activeImage: ActiveImage;
  onUpdateImageResult: (newBlob: Blob, newObjectUrl: string) => void;
}

export const BackgroundRemoverTool: React.FC<BackgroundRemoverToolProps> = ({
  activeImage,
  onUpdateImageResult,
}) => {
  const [selectedColorHex, setSelectedColorHex] = useState<string>('transparent');
  const [customHex, setCustomHex] = useState<string>('#3B82F6');
  const [sensitivity, setSensitivity] = useState<number>(45);
  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    progress: 0,
    message: '',
  });
  const [hasDone, setHasDone] = useState(false);

  // Keep the transparent result canvas so we can cheaply swap background colours
  const transparentCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Core removal ─────────────────────────────────────────────────────────────
  const handleRemoveBackground = async () => {
    setStatus({ isProcessing: true, progress: 5, message: 'Loading image…' });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeImage.objectUrl;
    await img.decode();

    const replacement: ReplacementBackground =
      selectedColorHex === 'transparent'
        ? { type: 'transparent' }
        : { type: 'color', hex: selectedColorHex === 'custom' ? customHex : selectedColorHex };

    try {
      const { maskCanvas, resultBlob } = await backgroundRemoverService.removeBackground(img, {
        replacementBg: replacement,
        sensitivity,
        onStatusChange: (s) => setStatus(s),
      });

      // Build the transparent canvas for colour swapping
      const w = maskCanvas.width;
      const h = maskCanvas.height;
      const tCanvas = document.createElement('canvas');
      tCanvas.width = w;
      tCanvas.height = h;
      const tCtx = tCanvas.getContext('2d')!;

      // Draw original image clipped to the alpha mask
      tCtx.drawImage(img, 0, 0, w, h);
      tCtx.globalCompositeOperation = 'destination-in';
      tCtx.drawImage(maskCanvas, 0, 0);
      transparentCanvasRef.current = tCanvas;

      const newObjectUrl = URL.createObjectURL(resultBlob);
      onUpdateImageResult(resultBlob, newObjectUrl);
      setHasDone(true);
    } catch {
      setStatus({
        isProcessing: false,
        progress: 0,
        message: '',
        error: 'Background removal failed. Try adjusting Sensitivity or using a clearer image.',
      });
    }
  };

  // ── Instant colour swap (no re-segmentation) ─────────────────────────────────
  const handleColorSelect = async (hex: string) => {
    setSelectedColorHex(hex);
    const targetHex = hex === 'custom' ? customHex : hex;

    if (transparentCanvasRef.current) {
      const { resultBlob } = await backgroundRemoverService.applyReplacementColor(
        transparentCanvasRef.current,
        targetHex
      );
      const newObjectUrl = URL.createObjectURL(resultBlob);
      onUpdateImageResult(resultBlob, newObjectUrl);
    }
  };

  const sensitivityLabel =
    sensitivity < 30 ? 'Conservative (preserve details)' :
    sensitivity < 55 ? 'Balanced' :
    sensitivity < 75 ? 'Aggressive' :
    'Maximum (remove most)';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-500" />
          <span>Smart Background Remover</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Multi-pass analysis with Lab colour matching, flood-fill, and smooth edge feathering — all in your browser.
        </p>
      </div>

      {/* Sensitivity Slider */}
      <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
            Removal Sensitivity
          </label>
          <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">{sensitivity}</span>
        </div>
        <input
          type="range"
          min={10}
          max={90}
          step={5}
          value={sensitivity}
          onChange={(e) => setSensitivity(Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer"
        />
        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">{sensitivityLabel}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          Increase if background remnants remain · Decrease to preserve fine details
        </p>
      </div>

      {/* Remove button */}
      <button
        onClick={handleRemoveBackground}
        disabled={status.isProcessing}
        className={`w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
          status.isProcessing
            ? 'bg-blue-400 cursor-not-allowed opacity-80'
            : hasDone
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'
        }`}
      >
        {status.isProcessing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Processing…</span>
          </>
        ) : hasDone ? (
          <>
            <RefreshCw className="w-4 h-4" />
            <span>Re-process with New Settings</span>
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            <span>Remove Background Now</span>
          </>
        )}
      </button>

      {/* Progress Bar */}
      {status.isProcessing && (
        <div className="space-y-2 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
          <div className="flex justify-between text-xs font-semibold text-blue-900 dark:text-blue-200">
            <span>{status.message}</span>
            <span>{status.progress}%</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {status.error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-medium">
          ⚠️ {status.error}
        </div>
      )}

      {/* Success hint */}
      {hasDone && !status.isProcessing && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          ✅ Background removed! Switch colours below instantly — no reprocessing needed.
        </div>
      )}

      {/* Replacement Background Palette */}
      <div className="space-y-3 pt-1">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-blue-500" />
          Replacement Background
        </label>

        <div className="grid grid-cols-4 gap-2">
          {PRESET_BACKGROUND_COLORS.map((bg) => (
            <button
              key={bg.id}
              onClick={() => handleColorSelect(bg.hex)}
              title={bg.name}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col items-center gap-1.5 ${
                selectedColorHex === bg.hex
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/30'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center ${
                  bg.isChecker ? 'checker-bg' : ''
                }`}
                style={!bg.isChecker ? { backgroundColor: bg.hex } : {}}
              >
                {selectedColorHex === bg.hex && (
                  <Check
                    className={`w-3.5 h-3.5 ${
                      bg.hex === '#FFFFFF' || bg.hex === '#F8F9FA' || bg.isChecker
                        ? 'text-slate-800'
                        : 'text-white'
                    }`}
                  />
                )}
              </div>
              <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate w-full text-center">
                {bg.name}
              </span>
            </button>
          ))}
        </div>

        {/* Custom colour picker */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="color"
            value={customHex}
            onChange={(e) => {
              setCustomHex(e.target.value);
              handleColorSelect(e.target.value);
            }}
            className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
            title="Pick a custom background colour"
          />
          <input
            type="text"
            value={customHex}
            onChange={(e) => {
              setCustomHex(e.target.value);
              if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                handleColorSelect(e.target.value);
              }
            }}
            placeholder="#3B82F6"
            maxLength={7}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 uppercase"
          />
          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">Custom</span>
        </div>
      </div>

    </div>
  );
};
