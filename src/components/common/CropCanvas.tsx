import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, RotateCw, RefreshCcw, Check, Move, Grid } from 'lucide-react';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropCanvasProps {
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  aspectRatio: string; // 'free', '1:1', '35:45', '4:3', '16:9'
  onApplyCrop: (croppedCanvas: HTMLCanvasElement) => void;
  onCropChange?: (rect: CropRect) => void;
}

type HandleType = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | 'body' | 'image-pan';

export const CropCanvas: React.FC<CropCanvasProps> = ({
  imageUrl,
  naturalWidth,
  naturalHeight,
  aspectRatio,
  onApplyCrop,
  onCropChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [imagePan, setImagePan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropRect, setCropRect] = useState<CropRect>({ x: 50, y: 50, width: 300, height: 300 });
  const [showGrid, setShowGrid] = useState<boolean>(true);

  const dragRef = useRef<{
    handle: HandleType;
    startX: number;
    startY: number;
    origCrop: CropRect;
    origPan: { x: number; y: number };
  } | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      render();
    };
  }, [imageUrl]);

  // Handle container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setCanvasSize({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Initialize crop rect based on aspect ratio & canvas dimensions
  const initCropRect = useCallback(() => {
    const padding = 60;
    const maxW = Math.max(100, canvasSize.w - padding * 2);
    const maxH = Math.max(100, canvasSize.h - padding * 2);

    let targetRatio = 1;
    if (aspectRatio === '1:1') targetRatio = 1;
    else if (aspectRatio === '35:45') targetRatio = 35 / 45;
    else if (aspectRatio === '4:3') targetRatio = 4 / 3;
    else if (aspectRatio === '16:9') targetRatio = 16 / 9;
    else if (aspectRatio === 'free') targetRatio = naturalWidth / naturalHeight;

    let w = maxW;
    let h = w / targetRatio;
    if (h > maxH) {
      h = maxH;
      w = h * targetRatio;
    }

    const x = (canvasSize.w - w) / 2;
    const y = (canvasSize.h - h) / 2;

    const newRect = { x, y, width: w, height: h };
    setCropRect(newRect);
    onCropChange?.(newRect);
  }, [canvasSize, aspectRatio, naturalWidth, naturalHeight, onCropChange]);

  useEffect(() => {
    if (canvasSize.w > 0 && canvasSize.h > 0) {
      initCropRect();
    }
  }, [canvasSize, aspectRatio, initCropRect]);

  // Main rendering loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d')!;
    const { w, h } = { w: canvas.width, h: canvas.height };

    ctx.clearRect(0, 0, w, h);

    // Draw checkerboard background
    const tileSize = 16;
    for (let y = 0; y < h; y += tileSize) {
      for (let x = 0; x < w; x += tileSize) {
        ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? '#e2e8f0' : '#f8fafc';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // Draw transformed image
    ctx.save();
    const cx = w / 2 + imagePan.x;
    const cy = h / 2 + imagePan.y;
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);

    const baseScale = Math.min((w * 0.8) / naturalWidth, (h * 0.8) / naturalHeight);
    const drawW = naturalWidth * baseScale * zoom;
    const drawH = naturalHeight * baseScale * zoom;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Dark scrim around crop box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    // Top
    ctx.fillRect(0, 0, w, cropRect.y);
    // Bottom
    ctx.fillRect(0, cropRect.y + cropRect.height, w, h - (cropRect.y + cropRect.height));
    // Left
    ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.height);
    // Right
    ctx.fillRect(cropRect.x + cropRect.width, cropRect.y, w - (cropRect.x + cropRect.width), cropRect.height);

    // Crop box outline
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

    // Rule-of-thirds Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Vertical lines
      for (let i = 1; i <= 2; i++) {
        const gx = cropRect.x + (cropRect.width / 3) * i;
        ctx.beginPath();
        ctx.moveTo(gx, cropRect.y);
        ctx.lineTo(gx, cropRect.y + cropRect.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let i = 1; i <= 2; i++) {
        const gy = cropRect.y + (cropRect.height / 3) * i;
        ctx.beginPath();
        ctx.moveTo(cropRect.x, gy);
        ctx.lineTo(cropRect.x + cropRect.width, gy);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Handles (Corner and Edge handles)
    const handleSize = 10;
    const corners = [
      { x: cropRect.x, y: cropRect.y },
      { x: cropRect.x + cropRect.width, y: cropRect.y },
      { x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height },
      { x: cropRect.x, y: cropRect.y + cropRect.height },
    ];

    // Corner L-brackets
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    const armLen = 16;

    // NW
    ctx.beginPath();
    ctx.moveTo(cropRect.x, cropRect.y + armLen);
    ctx.lineTo(cropRect.x, cropRect.y);
    ctx.lineTo(cropRect.x + armLen, cropRect.y);
    ctx.stroke();

    // NE
    ctx.beginPath();
    ctx.moveTo(cropRect.x + cropRect.width - armLen, cropRect.y);
    ctx.lineTo(cropRect.x + cropRect.width, cropRect.y);
    ctx.lineTo(cropRect.x + cropRect.width, cropRect.y + armLen);
    ctx.stroke();

    // SE
    ctx.beginPath();
    ctx.moveTo(cropRect.x + cropRect.width, cropRect.y + cropRect.height - armLen);
    ctx.lineTo(cropRect.x + cropRect.width, cropRect.y + cropRect.height);
    ctx.lineTo(cropRect.x + cropRect.width - armLen, cropRect.y + cropRect.height);
    ctx.stroke();

    // SW
    ctx.beginPath();
    ctx.moveTo(cropRect.x + armLen, cropRect.y + cropRect.height);
    ctx.lineTo(cropRect.x, cropRect.y + cropRect.height);
    ctx.lineTo(cropRect.x, cropRect.y + cropRect.height - armLen);
    ctx.stroke();

    // Corner Dots
    corners.forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, handleSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Dimension label
    const dimText = `${Math.round(cropRect.width)} × ${Math.round(cropRect.height)} px`;
    ctx.font = 'bold 11px Inter, sans-serif';
    const textWidth = ctx.measureText(dimText).width;
    const badgeX = cropRect.x + (cropRect.width - textWidth - 16) / 2;
    const badgeY = cropRect.y + cropRect.height + 8;

    if (badgeY + 22 < h) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, textWidth + 16, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(dimText, badgeX + 8, badgeY + 15);
    }
  }, [canvasSize, imagePan, zoom, rotation, cropRect, showGrid, naturalWidth, naturalHeight]);

  useEffect(() => {
    render();
  }, [render]);

  // Pointer event handlers for interactive resizing and panning
  const getHandleAt = (x: number, y: number): HandleType | null => {
    const threshold = 18;
    const { x: cx, y: cy, width: cw, height: ch } = cropRect;

    if (Math.hypot(x - cx, y - cy) <= threshold) return 'nw';
    if (Math.hypot(x - (cx + cw), y - cy) <= threshold) return 'ne';
    if (Math.hypot(x - (cx + cw), y - (cy + ch)) <= threshold) return 'se';
    if (Math.hypot(x - cx, y - (cy + ch)) <= threshold) return 'sw';

    if (Math.abs(y - cy) <= threshold && x >= cx && x <= cx + cw) return 'n';
    if (Math.abs(y - (cy + ch)) <= threshold && x >= cx && x <= cx + cw) return 's';
    if (Math.abs(x - cx) <= threshold && y >= cy && y <= cy + ch) return 'w';
    if (Math.abs(x - (cx + cw)) <= threshold && y >= cy && y <= cy + ch) return 'e';

    if (x > cx && x < cx + cw && y > cy && y < cy + ch) return 'body';

    return 'image-pan';
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const handle = getHandleAt(x, y);
    if (handle) {
      dragRef.current = {
        handle,
        startX: x,
        startY: y,
        origCrop: { ...cropRect },
        origPan: { ...imagePan },
      };
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!dragRef.current) {
      const handle = getHandleAt(x, y);
      if (handle === 'nw' || handle === 'se') canvas.style.cursor = 'nwse-resize';
      else if (handle === 'ne' || handle === 'sw') canvas.style.cursor = 'nesw-resize';
      else if (handle === 'n' || handle === 's') canvas.style.cursor = 'ns-resize';
      else if (handle === 'e' || handle === 'w') canvas.style.cursor = 'ew-resize';
      else if (handle === 'body') canvas.style.cursor = 'move';
      else canvas.style.cursor = 'grab';
      return;
    }

    const { handle, startX, startY, origCrop, origPan } = dragRef.current;
    const dx = x - startX;
    const dy = y - startY;

    if (handle === 'image-pan') {
      setImagePan({
        x: origPan.x + dx,
        y: origPan.y + dy,
      });
      return;
    }

    let newCrop = { ...origCrop };
    const minSize = 40;

    if (handle === 'body') {
      newCrop.x = Math.max(0, Math.min(canvasSize.w - origCrop.width, origCrop.x + dx));
      newCrop.y = Math.max(0, Math.min(canvasSize.h - origCrop.height, origCrop.y + dy));
    } else {
      let nx = origCrop.x;
      let ny = origCrop.y;
      let nw = origCrop.width;
      let nh = origCrop.height;

      if (handle.includes('e')) nw = Math.max(minSize, origCrop.width + dx);
      if (handle.includes('s')) nh = Math.max(minSize, origCrop.height + dy);
      if (handle.includes('w')) {
        nw = Math.max(minSize, origCrop.width - dx);
        nx = origCrop.x + (origCrop.width - nw);
      }
      if (handle.includes('n')) {
        nh = Math.max(minSize, origCrop.height - dy);
        ny = origCrop.y + (origCrop.height - nh);
      }

      // Maintain aspect ratio if set
      if (aspectRatio !== 'free') {
        let r = 1;
        if (aspectRatio === '1:1') r = 1;
        else if (aspectRatio === '35:45') r = 35 / 45;
        else if (aspectRatio === '4:3') r = 4 / 3;
        else if (aspectRatio === '16:9') r = 16 / 9;

        if (handle === 'e' || handle === 'w') {
          nh = nw / r;
        } else {
          nw = nh * r;
        }
      }

      newCrop = {
        x: Math.max(0, Math.min(canvasSize.w - nw, nx)),
        y: Math.max(0, Math.min(canvasSize.h - nh, ny)),
        width: Math.min(canvasSize.w, nw),
        height: Math.min(canvasSize.h, nh),
      };
    }

    setCropRect(newCrop);
    onCropChange?.(newCrop);
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  // Perform Final Crop Render
  const handleApply = () => {
    const img = imageRef.current;
    if (!img) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = Math.round(cropRect.width);
    outCanvas.height = Math.round(cropRect.height);
    const ctx = outCanvas.getContext('2d')!;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const w = canvasSize.w;
    const h = canvasSize.h;
    const cx = w / 2 + imagePan.x - cropRect.x;
    const cy = h / 2 + imagePan.y - cropRect.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);

    const baseScale = Math.min((w * 0.8) / naturalWidth, (h * 0.8) / naturalHeight);
    const drawW = naturalWidth * baseScale * zoom;
    const drawH = naturalHeight * baseScale * zoom;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    onApplyCrop(outCanvas);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setImagePan({ x: 0, y: 0 });
    initCropRect();
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none" ref={containerRef}>
      {/* Interactive Main Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        className="w-full h-full block touch-none"
      />

      {/* Top Floating Helper Tooltip */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur text-white text-xs font-semibold shadow-lg pointer-events-none flex items-center gap-2">
        <Move className="w-3.5 h-3.5 text-blue-400" />
        <span>Drag corner handles to resize crop frame • Drag image to reposition</span>
      </div>

      {/* DIRECT FLOATING SLIDERS ATTACHED TO THE PICTURE */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col md:flex-row items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Zoom Slider */}
        <div className="flex items-center gap-2 px-2">
          <ZoomIn className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Zoom</span>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-28 md:w-36 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 w-10">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-700" />

        {/* Rotation Slider & 90 deg Quick Turn */}
        <div className="flex items-center gap-2 px-2">
          <RotateCw className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Angle</span>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotation}
            onChange={(e) => setRotation(parseInt(e.target.value, 10))}
            className="w-24 md:w-28 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 w-10">
            {rotation}°
          </span>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-700" />

        {/* Action Buttons: Grid toggle, Reset, Apply */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid((g) => !g)}
            className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
              showGrid
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
            title="Toggle Rule of Thirds Grid"
          >
            <Grid className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
            title="Reset crop and alignments"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleApply}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Apply Crop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
