import type { PhysicalUnit } from '../types';

export const INCH_IN_MM = 25.4;
export const INCH_IN_CM = 2.54;

export const dpiCalculator = {
  /**
   * Convert physical dimensions to exact pixel dimensions at a specific DPI
   */
  physicalToPixels(val: number, unit: PhysicalUnit, dpi: number = 300): number {
    if (unit === 'px') return Math.round(val);
    let inches = val;
    if (unit === 'mm') {
      inches = val / INCH_IN_MM;
    } else if (unit === 'cm') {
      inches = val / INCH_IN_CM;
    }
    return Math.round(inches * dpi);
  },

  /**
   * Convert pixel dimensions to physical dimensions at a specific DPI
   */
  pixelsToPhysical(pixels: number, unit: PhysicalUnit, dpi: number = 300): number {
    if (unit === 'px') return pixels;
    const inches = pixels / dpi;
    if (unit === 'mm') {
      return Number((inches * INCH_IN_MM).toFixed(2));
    }
    if (unit === 'cm') {
      return Number((inches * INCH_IN_CM).toFixed(2));
    }
    return Number(inches.toFixed(3));
  },

  /**
   * Calculate effective DPI given physical dimensions and pixel dimensions
   */
  calculateDpi(pixels: number, physicalVal: number, unit: PhysicalUnit): number {
    if (physicalVal <= 0 || unit === 'px') return 300;
    let inches = physicalVal;
    if (unit === 'mm') inches = physicalVal / INCH_IN_MM;
    if (unit === 'cm') inches = physicalVal / INCH_IN_CM;
    return Math.round(pixels / inches);
  },

  /**
   * Format human-readable dimension display string
   */
  formatDimensions(width: number, height: number, unit: PhysicalUnit, dpi?: number): string {
    if (unit === 'px') return `${width} × ${height} px`;
    return `${width} × ${height} ${unit}${dpi ? ` @ ${dpi} DPI` : ''}`;
  }
};
