import { jsPDF } from 'jspdf';
import type { PassportPreset, SheetConfig } from '../types';
import { PAPER_SIZES } from '../constants/passportPresets';
import { dpiCalculator } from './dpiCalculator';

export interface GeneratedSheetResult {
  canvas: HTMLCanvasElement;
  jpgBlob: Blob;
  pdfBlob: Blob;
  rows: number;
  cols: number;
  totalCopiesOnPage: number;
}

export class SheetMakerService {
  /**
   * Generate high-DPI print canvas & vector PDF
   */
  async generateSheet(
    photoCanvas: HTMLCanvasElement,
    preset: PassportPreset,
    config: SheetConfig
  ): Promise<GeneratedSheetResult> {
    const paper = PAPER_SIZES.find(p => p.id === config.paperSizeId) || PAPER_SIZES[0];
    const targetDpi = 300;

    // Convert paper size to pixels at 300 DPI
    const sheetPxW = Math.round((paper.widthMm / 25.4) * targetDpi);
    const sheetPxH = Math.round((paper.heightMm / 25.4) * targetDpi);

    // Convert photo size to pixels at 300 DPI
    const photoPxW = dpiCalculator.physicalToPixels(preset.width, preset.unit, targetDpi);
    const photoPxH = dpiCalculator.physicalToPixels(preset.height, preset.unit, targetDpi);

    const marginPx = Math.round((config.marginMm / 25.4) * targetDpi);
    const spacingPx = Math.round((config.spacingMm / 25.4) * targetDpi);

    const availableW = sheetPxW - marginPx * 2;
    const availableH = sheetPxH - marginPx * 2;

    const maxCols = Math.floor((availableW + spacingPx) / (photoPxW + spacingPx));
    const maxRows = Math.floor((availableH + spacingPx) / (photoPxH + spacingPx));

    const totalPossible = Math.max(1, maxCols * maxRows);
    const actualCopies = Math.min(config.copyCount, totalPossible);

    const cols = Math.min(maxCols, actualCopies);
    const rows = Math.ceil(actualCopies / cols);

    // Calculate grid bounding box for centering
    const gridPxW = cols * photoPxW + (cols - 1) * spacingPx;
    const gridPxH = rows * photoPxH + (rows - 1) * spacingPx;

    const startX = config.centerSheet ? Math.round((sheetPxW - gridPxW) / 2) : marginPx;
    const startY = config.centerSheet ? Math.round((sheetPxH - gridPxH) / 2) : marginPx;

    // Create high-res sheet canvas
    const canvas = document.createElement('canvas');
    canvas.width = sheetPxW;
    canvas.height = sheetPxH;
    const ctx = canvas.getContext('2d')!;

    // White background paper
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, sheetPxW, sheetPxH);

    let placed = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (placed >= actualCopies) break;

        const x = startX + c * (photoPxW + spacingPx);
        const y = startY + r * (photoPxH + spacingPx);

        // Draw photo
        ctx.drawImage(photoCanvas, x, y, photoPxW, photoPxH);

        // Draw thin subtle border around photo
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, photoPxW, photoPxH);

        // Draw crop marks if enabled
        if (config.showCropMarks) {
          this.drawCropMarks(ctx, x, y, photoPxW, photoPxH, Math.round(targetDpi * 0.15));
        }

        placed++;
      }
    }

    // Export JPG blob
    const jpgBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.98);
    });

    // Generate physical vector PDF using jsPDF
    const pdfOrientation = paper.widthMm > paper.heightMm ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation: pdfOrientation,
      unit: 'mm',
      format: [paper.widthMm, paper.heightMm]
    });

    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.98);
    pdf.addImage(imgDataUrl, 'JPEG', 0, 0, paper.widthMm, paper.heightMm);

    const pdfBlob = pdf.output('blob');

    return {
      canvas,
      jpgBlob,
      pdfBlob,
      rows,
      cols,
      totalCopiesOnPage: actualCopies
    };
  }

  private drawCropMarks(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    markLen: number
  ) {
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x - markLen, y); ctx.lineTo(x, y);
    ctx.moveTo(x, y - markLen); ctx.lineTo(x, y);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + w, y); ctx.lineTo(x + w + markLen, y);
    ctx.moveTo(x + w, y - markLen); ctx.lineTo(x + w, y);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x - markLen, y + h); ctx.lineTo(x, y + h);
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + h + markLen);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w, y + h); ctx.lineTo(x + w + markLen, y + h);
    ctx.moveTo(x + w, y + h); ctx.lineTo(x + w, y + h + markLen);
    ctx.stroke();
  }
}

export const sheetMakerService = new SheetMakerService();
