import React, { useState } from 'react';
import { PRESET_BACKGROUND_COLORS, backgroundRemoverService, type ReplacementBackground } from '../../services/backgroundRemoverService';
import type { ActiveImage, ProcessingStatus } from '../../types';
import { Wand2, Check, RefreshCw, Palette } from 'lucide-react';

interface BackgroundRemoverToolProps {
  activeImage: ActiveImage;
  onUpdateImageResult: (newBlob: Blob, newObjectUrl: string) => void;
}

export const BackgroundRemoverTool: React.FC<BackgroundRemoverToolProps> = ({
  activeImage,
  onUpdateImageResult
}) => {
  const [selectedColorHex, setSelectedColorHex] = useState<string>('transparent');
  const [customHex, setCustomHex] = useState<string>('#3B82F6');
  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    progress: 0,
    message: ''
  });
  const [removedMaskCanvas, setRemovedMaskCanvas] = useState<HTMLCanvasElement | null>(null);

  const handleRemoveBackground = async () => {
    setStatus({ isProcessing: true, progress: 10, message: 'Initializing canvas workspace...' });

    const img = new Image();
    img.src = activeImage.objectUrl;
    await img.decode();

    const replacement: ReplacementBackground = selectedColorHex === 'transparent' 
      ? { type: 'transparent' } 
      : { type: 'color', hex: selectedColorHex === 'custom' ? customHex : selectedColorHex };

    try {
      const { maskCanvas, resultBlob } = await backgroundRemoverService.removeBackground(img, {
        replacementBg: replacement,
        onStatusChange: (s) => setStatus(s)
      });

      setRemovedMaskCanvas(maskCanvas);

      const newObjectUrl = URL.createObjectURL(resultBlob);
      onUpdateImageResult(resultBlob, newObjectUrl);
    } catch (err) {
      setStatus({
        isProcessing: false,
        progress: 0,
        message: '',
        error: 'Background removal failed. Please try again with a clearer image.'
      });
    }
  };

  const handleColorSelect = async (hex: string) => {
    setSelectedColorHex(hex);
    const targetHex = hex === 'custom' ? customHex : hex;

    // If background was already segmented, rapidly re-apply color without re-running segmentation
    if (removedMaskCanvas) {
      const { resultBlob } = await backgroundRemoverService.applyReplacementColor(removedMaskCanvas, targetHex);
      const newObjectUrl = URL.createObjectURL(resultBlob);
      onUpdateImageResult(resultBlob, newObjectUrl);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>AI Background Remover</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Detect subject and remove image background locally in your browser.
        </p>
      </div>

      {/* Main trigger button */}
      <button
        onClick={handleRemoveBackground}
        disabled={status.isProcessing}
        className={`w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${
          status.isProcessing
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'
        }`}
      >
        {status.isProcessing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Processing Image...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            <span>Remove Background Now</span>
          </>
        )}
      </button>

      {/* Status Progress Bar */}
      {status.isProcessing && (
        <div className="space-y-2 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
          <div className="flex justify-between text-xs font-semibold text-blue-900 dark:text-blue-200">
            <span>{status.message}</span>
            <span>{status.progress}%</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {status.error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-medium">
          {status.error}
        </div>
      )}

      {/* Replacement Background Palette */}
      <div className="space-y-3 pt-2">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-blue-500" />
          <span>Replacement Background</span>
        </label>

        <div className="grid grid-cols-4 gap-2">
          {PRESET_BACKGROUND_COLORS.map((bg) => (
            <button
              key={bg.id}
              onClick={() => handleColorSelect(bg.hex)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col items-center gap-1.5 ${
                selectedColorHex === bg.hex
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center ${
                  bg.isChecker ? 'checker-bg' : ''
                }`}
                style={!bg.isChecker ? { backgroundColor: bg.hex } : {}}
              >
                {selectedColorHex === bg.hex && (
                  <Check className={`w-3.5 h-3.5 ${bg.hex === '#FFFFFF' || bg.hex === '#F8F9FA' ? 'text-slate-800' : 'text-white'}`} />
                )}
              </div>
              <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate w-full text-center">
                {bg.name}
              </span>
            </button>
          ))}
        </div>

        {/* Custom Hex Color Picker */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="color"
            value={customHex}
            onChange={(e) => {
              setCustomHex(e.target.value);
              handleColorSelect(e.target.value);
            }}
            className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
          />
          <input
            type="text"
            value={customHex}
            onChange={(e) => {
              setCustomHex(e.target.value);
              handleColorSelect(e.target.value);
            }}
            placeholder="#3B82F6"
            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 uppercase"
          />
        </div>
      </div>

    </div>
  );
};
