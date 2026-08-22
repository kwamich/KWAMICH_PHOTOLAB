import React, { useRef, useEffect, useCallback, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransformState {
  x: number;        // image centre offset-x inside canvas (px)
  y: number;        // image centre offset-y inside canvas (px)
  width: number;    // display width  (px, not final output)
  height: number;   // display height (px, not final output)
  rotation: number; // degrees
}

interface TransformCanvasProps {
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  /** Called on every live change while dragging */
  onChange: (t: TransformState) => void;
  /** Called when the user clicks "Apply" — receives the rasterised canvas */
  onCommit: (canvas: HTMLCanvasElement) => void;
  /** Mirror from right-panel inspector (syncs handles when user types) */
  externalTransform?: Partial<TransformState>;
  maintainAspect?: boolean;
}

// ─── Handle definitions ───────────────────────────────────────────────────────

type HandleId =
  | 'nw' | 'n' | 'ne'
  | 'e'  |       'w'
  | 'sw' | 's' | 'se'
  | 'rotate';

interface Handle {
  id: HandleId;
  /** fraction [-0.5..0.5] of width & height from centre */
  fx: number;
  fy: number;
  cursor: string;
}

const HANDLES: Handle[] = [
  { id: 'nw',     fx: -0.5, fy: -0.5, cursor: 'nwse-resize' },
  { id: 'n',      fx:  0,   fy: -0.5, cursor: 'ns-resize'   },
  { id: 'ne',     fx:  0.5, fy: -0.5, cursor: 'nesw-resize' },
  { id: 'e',      fx:  0.5, fy:  0,   cursor: 'ew-resize'   },
  { id: 'se',     fx:  0.5, fy:  0.5, cursor: 'nwse-resize' },
  { id: 's',      fx:  0,   fy:  0.5, cursor: 'ns-resize'   },
  { id: 'sw',     fx: -0.5, fy:  0.5, cursor: 'nesw-resize' },
  { id: 'w',      fx: -0.5, fy:  0,   cursor: 'ew-resize'   },
  { id: 'rotate', fx:  0,   fy: -0.5, cursor: 'grab'        },
];

const HANDLE_SIZE = 10; // px radius
const ROTATE_ARM  = 30; // px above the top-centre handle

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEG = (rad: number) => rad * (180 / Math.PI);
const RAD = (deg: number) => deg * (Math.PI / 180);

/** Rotate a point around origin */
function rotatePoint(px: number, py: number, cx: number, cy: number, deg: number): [number, number] {
  const r = RAD(deg);
  const cos = Math.cos(r), sin = Math.sin(r);
  const dx = px - cx, dy = py - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

/** Canvas-space position of a handle */
function handlePos(t: TransformState, h: Handle): [number, number] {
  const lx = t.x + h.fx * t.width;
  const ly = t.y + h.fy * t.height;
  return rotatePoint(lx, ly, t.x, t.y, t.rotation);
}

function rotateHandlePos(t: TransformState): [number, number] {
  const lx = t.x;
  const ly = t.y - t.height * 0.5 - ROTATE_ARM;
  return rotatePoint(lx, ly, t.x, t.y, t.rotation);
}

function getClientPos(e: MouseEvent | TouchEvent): { cx: number; cy: number } {
  if ('touches' in e) {
    return { cx: e.touches[0].clientX, cy: e.touches[0].clientY };
  }
  return { cx: e.clientX, cy: e.clientY };
}

function hitTest(px: number, py: number, hx: number, hy: number): boolean {
  return Math.hypot(px - hx, py - hy) <= HANDLE_SIZE + 4;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TransformCanvas: React.FC<TransformCanvasProps> = ({
  imageUrl,
  naturalWidth,
  naturalHeight,
  onChange,
  onCommit,
  externalTransform,
  maintainAspect = true,
}) => {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const imageRef        = useRef<HTMLImageElement | null>(null);
  const transformRef    = useRef<TransformState>({ x: 0, y: 0, width: 0, height: 0, rotation: 0 });
  const dragRef         = useRef<{
    handle: HandleId | 'body';
    startX: number; startY: number;
    origT: TransformState;
    origAspect: number;
  } | null>(null);

  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [isApplying, setIsApplying]  = useState(false);
  const [showGrid, setShowGrid]      = useState(false);

  // ── Load image & initialise transform ──────────────────────────────────────
  const initTransform = useCallback((cw: number, ch: number) => {
    const pad = 64;
    const maxW = cw - pad * 2;
    const maxH = ch - pad * 2;
    const scale = Math.min(maxW / naturalWidth, maxH / naturalHeight, 1);
    const w = naturalWidth  * scale;
    const h = naturalHeight * scale;
    const t: TransformState = { x: cw / 2, y: ch / 2, width: w, height: h, rotation: 0 };
    transformRef.current = t;
    onChange(t);
  }, [naturalWidth, naturalHeight, onChange]);

  // ── Size canvas to container ───────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── When canvas size changes, re-init transform ───────────────────────────
  useEffect(() => {
    if (canvasSize.w > 0 && canvasSize.h > 0) {
      initTransform(canvasSize.w, canvasSize.h);
    }
  }, [canvasSize, initTransform]);

  // ── Load image once ────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => { imageRef.current = img; render(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  // ── Apply external transform from inspector panel ─────────────────────────
  useEffect(() => {
    if (!externalTransform) return;
    transformRef.current = { ...transformRef.current, ...externalTransform };
    render();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTransform]);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d')!;
    const { w, h } = { w: canvas.width, h: canvas.height };
    const t = transformRef.current;

    ctx.clearRect(0, 0, w, h);

    // Checkerboard background
    drawChecker(ctx, w, h);

    // Save → translate to centre → rotate → draw image ─────────────────────
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(RAD(t.rotation));

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -t.width / 2, -t.height / 2, t.width, t.height);
    ctx.restore();

    // Grid overlay ──────────────────────────────────────────────────────────
    if (showGrid) drawGrid(ctx, t);

    // Image border rect ─────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(RAD(t.rotation));
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(-t.width / 2, -t.height / 2, t.width, t.height);
    ctx.restore();

    // Rotation arm ──────────────────────────────────────────────────────────
    const [rx, ry] = rotateHandlePos(t);
    const [nx, ny] = handlePos(t, HANDLES.find(h2 => h2.id === 'n')!);
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(rx, ry);
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Handles ────────────────────────────────────────────────────────────────
    for (const h of HANDLES) {
      const [hx, hy] = h.id === 'rotate' ? rotateHandlePos(t) : handlePos(t, h);
      ctx.beginPath();
      if (h.id === 'rotate') {
        // Rotation knob: circle with arrow icon feel
        ctx.arc(hx, hy, HANDLE_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = '#6366F1';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Mini rotation symbol
        ctx.save();
        ctx.translate(hx, hy);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 4, -0.5, Math.PI * 1.5);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.arc(hx, hy, HANDLE_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Dimension readout in canvas ───────────────────────────────────────────
    const label = `${Math.round(t.width)} × ${Math.round(t.height)} px  ${t.rotation !== 0 ? `| ${t.rotation.toFixed(1)}°` : ''}`;
    ctx.font = 'bold 12px Inter, sans-serif';
    const tw = ctx.measureText(label).width;
    const bx = t.x - tw / 2 - 8;
    const by = t.y + t.height / 2 + 18;
    ctx.fillStyle = 'rgba(59,130,246,0.92)';
    roundRect(ctx, bx, by, tw + 16, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, bx + 8, by + 14.5);

  }, [showGrid]);

  // Re-render whenever canvas size updates
  useEffect(() => { render(); }, [canvasSize, render]);

  // ─── DRAG LOGIC ────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const raw  = 'touches' in e ? e.touches[0] : e;
    const px   = raw.clientX - rect.left;
    const py   = raw.clientY - rect.top;
    const t    = transformRef.current;

    // Test rotation handle first (takes precedence)
    const [rx, ry] = rotateHandlePos(t);
    if (hitTest(px, py, rx, ry)) {
      dragRef.current = { handle: 'rotate', startX: px, startY: py, origT: { ...t }, origAspect: t.width / t.height };
      canvas.style.cursor = 'grabbing';
      return;
    }

    // Test resize handles
    for (const h of HANDLES) {
      if (h.id === 'rotate') continue;
      const [hx, hy] = handlePos(t, h);
      if (hitTest(px, py, hx, hy)) {
        dragRef.current = { handle: h.id, startX: px, startY: py, origT: { ...t }, origAspect: t.width / t.height };
        canvas.style.cursor = h.cursor;
        return;
      }
    }

    // Translate body (inside bounding box?)
    // Simple AABB check after un-rotating the click point
    const [ux, uy] = rotatePoint(px, py, t.x, t.y, -t.rotation);
    if (
      ux >= t.x - t.width  / 2 && ux <= t.x + t.width  / 2 &&
      uy >= t.y - t.height / 2 && uy <= t.y + t.height / 2
    ) {
      dragRef.current = { handle: 'body', startX: px, startY: py, origT: { ...t }, origAspect: t.width / t.height };
      canvas.style.cursor = 'move';
    }
  }, []);

  const onPointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const { cx, cy } = getClientPos(e);
    const px = cx - rect.left;
    const py = cy - rect.top;
    const dx = px - d.startX;
    const dy = py - d.startY;
    const ot = d.origT;
    let t = { ...ot };

    const aspect = d.origAspect;

    if (d.handle === 'body') {
      t.x = ot.x + dx;
      t.y = ot.y + dy;

    } else if (d.handle === 'rotate') {
      // Angle from centre to current pointer
      const angle = Math.atan2(py - ot.y, px - ot.x);
      t.rotation = DEG(angle) + 90; // +90 because arm points up

    } else {
      // ── Scale handle logic ────────────────────────────────────────────────
      // Un-rotate the delta into local image space
      const r = RAD(-ot.rotation);
      const ldx = dx * Math.cos(r) - dy * Math.sin(r);
      const ldy = dx * Math.sin(r) + dy * Math.cos(r);

      const h = d.handle;
      const isN = h.includes('n');
      const isS = h.includes('s');
      const isW = h.includes('w');
      const isE = h.includes('e');

      let newW = ot.width;
      let newH = ot.height;
      let offX = 0;
      let offY = 0;

      if (isE) { newW = Math.max(20, ot.width  + ldx); offX = (newW - ot.width)  / 2; }
      if (isW) { newW = Math.max(20, ot.width  - ldx); offX = -(newW - ot.width) / 2; }
      if (isS) { newH = Math.max(20, ot.height + ldy); offY = (newH - ot.height) / 2; }
      if (isN) { newH = Math.max(20, ot.height - ldy); offY = -(newH - ot.height) / 2; }

      // Maintain aspect for corner handles or when locked
      const isCorner = (isN || isS) && (isE || isW);
      if (maintainAspect && isCorner) {
        const dominated = Math.abs(ldx) > Math.abs(ldy);
        if (dominated) {
          newH = newW / aspect;
          offY = isN ? -(newH - ot.height) / 2 : (newH - ot.height) / 2;
        } else {
          newW = newH * aspect;
          offX = isW ? -(newW - ot.width) / 2 : (newW - ot.width) / 2;
        }
      }

      // Convert local offset back to canvas-space
      const r2  = RAD(ot.rotation);
      const cos = Math.cos(r2), sin = Math.sin(r2);
      t.x      = ot.x + offX * cos - offY * sin;
      t.y      = ot.y + offX * sin + offY * cos;
      t.width  = newW;
      t.height = newH;
    }

    // Snap rotation to 45° increments when within 4°
    if (d.handle === 'rotate') {
      const snap = Math.round(t.rotation / 45) * 45;
      if (Math.abs(t.rotation - snap) < 4) t.rotation = snap;
    }

    transformRef.current = t;
    onChange(t);
    render();
  }, [maintainAspect, onChange, render]);

  const onPointerUp = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = 'default';
    dragRef.current = null;
  }, []);

  // Attach global listeners
  useEffect(() => {
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup',   onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend',  onPointerUp);
    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup',   onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend',  onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  // Cursor hint on hover
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px   = e.clientX - rect.left;
    const py   = e.clientY - rect.top;
    const t    = transformRef.current;

    const [rx, ry] = rotateHandlePos(t);
    if (hitTest(px, py, rx, ry)) { canvas.style.cursor = 'grab'; return; }

    for (const h of HANDLES) {
      if (h.id === 'rotate') continue;
      const [hx, hy] = handlePos(t, h);
      if (hitTest(px, py, hx, hy)) { canvas.style.cursor = h.cursor; return; }
    }

    const [ux, uy] = rotatePoint(px, py, t.x, t.y, -t.rotation);
    if (
      ux >= t.x - t.width  / 2 && ux <= t.x + t.width  / 2 &&
      uy >= t.y - t.height / 2 && uy <= t.y + t.height / 2
    ) { canvas.style.cursor = 'move'; return; }

    canvas.style.cursor = 'default';
  }, []);

  // ─── APPLY ─────────────────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    setIsApplying(true);

    const t = transformRef.current;

    // Output at natural image scale (no quality loss)
    const scaleX = naturalWidth  / t.width;
    const scaleY = naturalHeight / t.height;

    const out = document.createElement('canvas');
    out.width  = Math.round(t.width  * scaleX);
    out.height = Math.round(t.height * scaleY);

    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled  = true;
    ctx.imageSmoothingQuality  = 'high';

    ctx.save();
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate(RAD(t.rotation));
    ctx.drawImage(img, -out.width / 2, -out.height / 2, out.width, out.height);
    ctx.restore();

    onCommit(out);
    setTimeout(() => setIsApplying(false), 800);
  }, [naturalWidth, naturalHeight, onCommit]);

  // Reset to original
  const handleReset = useCallback(() => {
    initTransform(canvasSize.w, canvasSize.h);
    render();
  }, [initTransform, canvasSize, render]);

  return (
    <div className="relative flex flex-col w-full h-full" ref={containerRef}>

      {/* Canvas ─────────────────────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="absolute inset-0 w-full h-full"
        onMouseDown={onPointerDown}
        onMouseMove={onMouseMove}
        onTouchStart={onPointerDown}
      />

      {/* Toolbar ─────────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">

        {/* Grid toggle */}
        <button
          onClick={() => { setShowGrid(g => !g); render(); }}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white transition-colors shadow-md"
        >
          {showGrid ? 'Hide Grid' : 'Show Grid'}
        </button>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white transition-colors shadow-md"
        >
          Reset
        </button>

        {/* Apply */}
        <button
          onClick={handleApply}
          disabled={isApplying}
          className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all disabled:opacity-60 flex items-center gap-2"
        >
          {isApplying ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          )}
          {isApplying ? 'Applying…' : 'Apply Transform'}
        </button>
      </div>

      {/* Hint bar ────────────────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-black/50 text-white text-[11px] font-semibold backdrop-blur-md pointer-events-none select-none">
        Drag corners to resize · Drag top knob to rotate · Drag image to move
      </div>

    </div>
  );
};

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

function drawChecker(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = 16;
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#e5e7eb' : '#f9fafb';
      ctx.fillRect(x, y, size, size);
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, t: TransformState) {
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(RAD(t.rotation));
  ctx.strokeStyle = 'rgba(59,130,246,0.35)';
  ctx.lineWidth = 0.75;
  ctx.setLineDash([2, 4]);

  // Rule-of-thirds lines inside the image bounds
  for (let i = 1; i < 3; i++) {
    const xOff = -t.width / 2 + (t.width / 3) * i;
    const yOff = -t.height / 2 + (t.height / 3) * i;
    ctx.beginPath();
    ctx.moveTo(xOff, -t.height / 2);
    ctx.lineTo(xOff,  t.height / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-t.width / 2, yOff);
    ctx.lineTo( t.width / 2, yOff);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}


