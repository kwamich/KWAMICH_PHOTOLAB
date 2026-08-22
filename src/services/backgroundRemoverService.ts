import type { ProcessingStatus } from '../types';

export type ReplacementBackground = 
  | { type: 'transparent' }
  | { type: 'color'; hex: string };

export const PRESET_BACKGROUND_COLORS = [
  { id: 'transparent', name: 'Transparent', hex: 'transparent', isChecker: true },
  { id: 'white', name: 'Pure White', hex: '#FFFFFF' },
  { id: 'off_white', name: 'Off-White', hex: '#F8F9FA' },
  { id: 'light_grey', name: 'Light Grey', hex: '#E5E7EB' },
  { id: 'sky_blue', name: 'Light Blue', hex: '#DBEAFE' },
  { id: 'royal_blue', name: 'Royal Blue', hex: '#1E40AF' },
  { id: 'dark_blue', name: 'Passport Blue', hex: '#1E3A8A' },
  { id: 'red', name: 'Passport Red', hex: '#DC2626' },
];

export interface BackgroundRemovalOptions {
  onStatusChange?: (status: ProcessingStatus) => void;
  replacementBg?: ReplacementBackground;
  sensitivity?: number; // 0-100, higher = more aggressive removal
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: parse hex → {r,g,b}
// ─────────────────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = hex.replace('#', '');
  const full = n.length === 3
    ? n.split('').map(c => c + c).join('')
    : n;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Lab colour distance (perceptually uniform, better than RGB distance)
// ─────────────────────────────────────────────────────────────────────────────
function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  let R = r / 255, G = g / 255, B = b / 255;
  R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
  G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
  B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;

  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.00000;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;

  const fx = X > 0.008856 ? Math.cbrt(X) : 7.787 * X + 16 / 116;
  const fy = Y > 0.008856 ? Math.cbrt(Y) : 7.787 * Y + 16 / 116;
  const fz = Z > 0.008856 ? Math.cbrt(Z) : 7.787 * Z + 16 / 116;

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  const [l1, a1, b1_] = rgbToLab(r1, g1, b1);
  const [l2, a2, b2_] = rgbToLab(r2, g2, b2);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1_ - b2_) ** 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample background colour from multiple border strips (robust estimation)
// ─────────────────────────────────────────────────────────────────────────────
function sampleBorderBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  stripSize = 8          // sample this many pixels deep from each edge
): { r: number; g: number; b: number } {
  const samples: [number, number, number][] = [];

  const add = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  };

  for (let strip = 0; strip < stripSize; strip++) {
    for (let x = 0; x < width; x += 2) {
      add(x, strip);                   // top
      add(x, height - 1 - strip);     // bottom
    }
    for (let y = 0; y < height; y += 2) {
      add(strip, y);                   // left
      add(width - 1 - strip, y);      // right
    }
  }

  // Use median per channel (robust against corner artefacts)
  const sortedR = samples.map(s => s[0]).sort((a, b) => a - b);
  const sortedG = samples.map(s => s[1]).sort((a, b) => a - b);
  const sortedB = samples.map(s => s[2]).sort((a, b) => a - b);
  const mid = Math.floor(samples.length / 2);
  return { r: sortedR[mid], g: sortedG[mid], b: sortedB[mid] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build a per-pixel foreground probability map using multi-pass analysis
// ─────────────────────────────────────────────────────────────────────────────
function buildForegroundMap(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bgColor: { r: number; g: number; b: number },
  sensitivity: number          // 0-100
): Float32Array {
  // sensitivity → thresholds: higher sensitivity = remove more (larger threshold)
  const hardThreshold = 10 + sensitivity * 0.55;    // Lab units
  const softThreshold = 25 + sensitivity * 0.70;

  const fgMap = new Float32Array(width * height);  // 0 = bg, 1 = fg

  // ── Pass 1: colour distance from detected background ──────────────────────
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dist = labDistance(
        data[i], data[i + 1], data[i + 2],
        bgColor.r, bgColor.g, bgColor.b
      );

      if (dist < hardThreshold) {
        fgMap[y * width + x] = 0;          // definitely background
      } else if (dist > softThreshold) {
        fgMap[y * width + x] = 1;          // definitely foreground
      } else {
        // Soft transition zone: linear blend
        fgMap[y * width + x] = (dist - hardThreshold) / (softThreshold - hardThreshold);
      }
    }
  }

  // ── Pass 2: distance-from-centre boost (portrait centre = foreground) ─────
  const cx = width / 2;
  const cy = height * 0.42;   // portraits – face is roughly upper-mid
  const maxDist = Math.sqrt(cx * cx + (height * 0.58) * (height * 0.58));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
      // Pixels far from centre and near bg colour get extra penalty
      if (d > 0.70) {
        fgMap[y * width + x] *= Math.max(0, 1 - (d - 0.70) * 2);
      } else if (d < 0.35) {
        fgMap[y * width + x] = Math.min(1, fgMap[y * width + x] + 0.15);
      }
    }
  }

  // ── Pass 3: flood-fill from borders to catch connected background islands ─
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const enqueue = (idx: number) => {
    if (visited[idx]) return;
    if (fgMap[idx] > 0.40) return;   // stop at clear foreground
    visited[idx] = 1;
    fgMap[idx] = 0;
    queue.push(idx);
  };

  // Seed the flood from all four edges
  for (let x = 0; x < width; x++) {
    enqueue(x);                          // top row
    enqueue((height - 1) * width + x);  // bottom row
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(y * width);                  // left col
    enqueue(y * width + width - 1);     // right col
  }

  let qi = 0;
  while (qi < queue.length) {
    const idx = queue[qi++];
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (x > 0)          enqueue(idx - 1);
    if (x < width - 1)  enqueue(idx + 1);
    if (y > 0)          enqueue(idx - width);
    if (y < height - 1) enqueue(idx + width);
  }

  return fgMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gaussian blur on a Float32Array (for edge feathering)
// ─────────────────────────────────────────────────────────────────────────────
function blurMask(mask: Float32Array, width: number, height: number, radius = 2): Float32Array {
  const out = new Float32Array(mask.length);
  const kernelSize = radius * 2 + 1;
  const kernel: number[] = [];
  let ksum = 0;
  for (let k = -radius; k <= radius; k++) {
    const v = Math.exp(-(k * k) / (2 * radius * radius));
    kernel.push(v);
    ksum += v;
  }
  const nk = kernel.map(v => v / ksum);

  // Horizontal pass
  const tmp = new Float32Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let k = 0; k < kernelSize; k++) {
        const sx = Math.min(Math.max(x + k - radius, 0), width - 1);
        acc += mask[y * width + sx] * nk[k];
      }
      tmp[y * width + x] = acc;
    }
  }
  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let k = 0; k < kernelSize; k++) {
        const sy = Math.min(Math.max(y + k - radius, 0), height - 1);
        acc += tmp[sy * width + x] * nk[k];
      }
      out[y * width + x] = acc;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main service
// ─────────────────────────────────────────────────────────────────────────────
export class BackgroundRemoverService {

  async removeBackground(
    imageElement: HTMLImageElement | HTMLCanvasElement,
    options: BackgroundRemovalOptions = {}
  ): Promise<{ maskCanvas: HTMLCanvasElement; resultBlob: Blob }> {
    const {
      onStatusChange,
      replacementBg = { type: 'transparent' },
      sensitivity = 45,
    } = options;

    const report = (progress: number, message: string) => {
      onStatusChange?.({ isProcessing: true, progress, message });
    };

    report(10, 'Preparing image for analysis…');
    await tick(80);

    const width = imageElement instanceof HTMLCanvasElement
      ? imageElement.width : imageElement.naturalWidth || (imageElement as HTMLImageElement).width;
    const height = imageElement instanceof HTMLCanvasElement
      ? imageElement.height : imageElement.naturalHeight || (imageElement as HTMLImageElement).height;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = width;
    srcCanvas.height = height;
    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true })!;
    srcCtx.drawImage(imageElement, 0, 0);
    const imageData = srcCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    report(25, 'Sampling background colour from image borders…');
    await tick(60);
    const bgColor = sampleBorderBackground(data, width, height, 12);

    report(45, 'Building foreground probability map (multi-pass)…');
    await tick(60);
    let fgMap = buildForegroundMap(data, width, height, bgColor, sensitivity);

    report(65, 'Feathering edges for smooth transparency…');
    await tick(60);
    // Blur the edge zone for smooth transitions
    fgMap = blurMask(fgMap, width, height, 2);

    report(80, 'Compositing result with replacement background…');
    await tick(60);

    // Build mask canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d')!;
    const maskImgData = maskCtx.createImageData(width, height);
    for (let i = 0; i < width * height; i++) {
      const a = Math.round(Math.min(1, Math.max(0, fgMap[i])) * 255);
      maskImgData.data[i * 4 + 0] = 255;
      maskImgData.data[i * 4 + 1] = 255;
      maskImgData.data[i * 4 + 2] = 255;
      maskImgData.data[i * 4 + 3] = a;
    }
    maskCtx.putImageData(maskImgData, 0, 0);

    // Composite: draw replacement bg, then masked subject
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = width;
    resultCanvas.height = height;
    const resCtx = resultCanvas.getContext('2d')!;

    if (replacementBg.type === 'color' && replacementBg.hex !== 'transparent') {
      resCtx.fillStyle = replacementBg.hex;
      resCtx.fillRect(0, 0, width, height);
    }

    // Draw subject through mask
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = width;
    tmpCanvas.height = height;
    const tmpCtx = tmpCanvas.getContext('2d')!;
    tmpCtx.drawImage(srcCanvas, 0, 0);
    tmpCtx.globalCompositeOperation = 'destination-in';
    tmpCtx.drawImage(maskCanvas, 0, 0);
    resCtx.drawImage(tmpCanvas, 0, 0);

    const mime = replacementBg.type === 'color' && replacementBg.hex !== 'transparent'
      ? 'image/jpeg' : 'image/png';
    const resultBlob = await canvasToBlob(resultCanvas, mime, 0.96);

    report(100, 'Background removal complete.');
    onStatusChange?.({ isProcessing: false, progress: 100, message: 'Done' });

    return { maskCanvas, resultBlob };
  }

  /** Re-apply a different replacement colour to an already-masked canvas */
  async applyReplacementColor(
    transparentCanvas: HTMLCanvasElement,
    colorHex: string
  ): Promise<{ resultCanvas: HTMLCanvasElement; resultBlob: Blob }> {
    const { width, height } = transparentCanvas;
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = width;
    resultCanvas.height = height;
    const ctx = resultCanvas.getContext('2d')!;

    if (colorHex !== 'transparent') {
      ctx.fillStyle = colorHex;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(transparentCanvas, 0, 0);

    const mime = colorHex === 'transparent' ? 'image/png' : 'image/jpeg';
    const resultBlob = await canvasToBlob(resultCanvas, mime, 0.96);
    return { resultCanvas, resultBlob };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny helpers
// ─────────────────────────────────────────────────────────────────────────────
function tick(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), mime, quality));
}

// suppress unused warning
void hexToRgb;

export const backgroundRemoverService = new BackgroundRemoverService();
