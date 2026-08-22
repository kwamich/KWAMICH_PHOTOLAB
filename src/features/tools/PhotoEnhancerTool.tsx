import React, { useState } from 'react';
import type { ActiveImage, EnhancementConfig } from '../../types';
import { RefreshCcw, Sparkles } from 'lucide-react';

interface PhotoEnhancerToolProps {
  activeImage: ActiveImage;
  onApplyEnhancement: (config: EnhancementConfig, enhancedCanvas: HTMLCanvasElement) => void;
}

const DEFAULT_ENHANCEMENTS: EnhancementConfig = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  warmth: 0,
  exposure: 0,
  grayscale: false
};

export const PhotoEnhancerTool: React.FC<PhotoEnhancerToolProps> = ({
  activeImage,
  onApplyEnhancement
}) => {
  const [config, setConfig] = useState<EnhancementConfig>(DEFAULT_ENHANCEMENTS);

  const handleReset = () => {
    setConfig(DEFAULT_ENHANCEMENTS);
  };

  const handleApply = async () => {
    const img = new Image();
    img.src = activeImage.objectUrl;
    await img.decode();

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Construct CSS filter string for high performance rendering
    const bVal = 100 + config.brightness + config.exposure;
    const cVal = 100 + config.contrast;
    const sVal = 100 + config.saturation;
    const gVal = config.grayscale ? 100 : 0;
    const sepiaVal = config.warmth > 0 ? config.warmth * 0.3 : 0;
    const hueVal = config.warmth < 0 ? config.warmth * 0.2 : 0;

    ctx.filter = `brightness(${bVal}%) contrast(${cVal}%) saturate(${sVal}%) grayscale(${gVal}%) sepia(${sepiaVal}%) hue-rotate(${hueVal}deg)`;
    ctx.drawImage(img, 0, 0);

    onApplyEnhancement(config, canvas);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>Photo Enhancer</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Controlled brightness, contrast, sharpness, and color tone adjustments.
        </p>
      </div>

      {/* Adjustments Sliders */}
      <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        
        {/* Brightness */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Brightness</span>
            <span className="font-mono">{config.brightness > 0 ? `+${config.brightness}` : config.brightness}</span>
          </div>
          <input
            type="range"
            min={-50}
            max={50}
            value={config.brightness}
            onChange={(e) => setConfig({ ...config, brightness: Number(e.target.value) })}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Contrast</span>
            <span className="font-mono">{config.contrast > 0 ? `+${config.contrast}` : config.contrast}</span>
          </div>
          <input
            type="range"
            min={-50}
            max={50}
            value={config.contrast}
            onChange={(e) => setConfig({ ...config, contrast: Number(e.target.value) })}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Saturation */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Color Saturation</span>
            <span className="font-mono">{config.saturation > 0 ? `+${config.saturation}` : config.saturation}</span>
          </div>
          <input
            type="range"
            min={-50}
            max={50}
            value={config.saturation}
            onChange={(e) => setConfig({ ...config, saturation: Number(e.target.value) })}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Warmth */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Color Warmth</span>
            <span className="font-mono">{config.warmth > 0 ? `+${config.warmth}` : config.warmth}</span>
          </div>
          <input
            type="range"
            min={-40}
            max={40}
            value={config.warmth}
            onChange={(e) => setConfig({ ...config, warmth: Number(e.target.value) })}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Grayscale toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Grayscale (Black & White)</span>
          <button
            onClick={() => setConfig({ ...config, grayscale: !config.grayscale })}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              config.grayscale ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
              config.grayscale ? 'translate-x-5.5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        <button
          onClick={handleReset}
          className="w-full py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>Reset Adjustments</span>
        </button>

      </div>

      {/* Apply Action */}
      <button
        onClick={handleApply}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        <span>Apply Enhancements</span>
      </button>

    </div>
  );
};
