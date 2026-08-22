import React, { useState, useRef } from 'react';
import { SlidersHorizontal } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Original',
  afterLabel = 'Processed',
  className = ''
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // 0 to 100 percentage
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPos(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) {
      handleMove(e.clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onClick={(e) => handleMove(e.clientX)}
      className={`relative overflow-hidden select-none cursor-ew-resize rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md ${className}`}
    >
      {/* Background (After / Processed Image) */}
      <img
        src={afterUrl}
        alt="Processed"
        className="w-full h-full object-contain block checker-bg"
      />
      
      {/* Foreground (Before / Original Image Clipped) */}
      <div
        className="absolute top-0 left-0 bottom-0 overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={beforeUrl}
          alt="Original"
          className="max-w-none h-full object-contain block"
          style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%' }}
        />
      </div>

      {/* Slider Line Divider */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] cursor-ew-resize flex items-center justify-center z-10"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-2 border-blue-500 shadow-lg flex items-center justify-center">
          <SlidersHorizontal className="w-4 h-4 rotate-90" />
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold tracking-wide uppercase">
        {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-blue-600/80 backdrop-blur-md text-white text-[11px] font-semibold tracking-wide uppercase">
        {afterLabel}
      </span>
    </div>
  );
};
