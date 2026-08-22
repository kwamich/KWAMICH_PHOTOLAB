import type { CompressionConfig, OutputFormat } from '../types';

export class ImageCompressorService {
  /**
   * Compress image canvas to target format and quality
   */
  async compressCanvas(
    canvas: HTMLCanvasElement,
    config: CompressionConfig
  ): Promise<{ blob: Blob; sizeBytes: number; qualityUsed: number }> {
    const { format, quality, targetMaxSizeBytes } = config;

    const mime = this.getMimeType(format);

    // If target size specified, run binary search quality adjustment
    if (targetMaxSizeBytes && targetMaxSizeBytes > 0) {
      return this.compressToTargetSize(canvas, format, targetMaxSizeBytes);
    }

    const normQuality = Math.max(0.01, Math.min(1.0, quality / 100));

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), mime, normQuality);
    });

    return {
      blob,
      sizeBytes: blob.size,
      qualityUsed: quality
    };
  }

  /**
   * Intelligent binary search compression to hit exact target file size (e.g. 500 KB)
   */
  private async compressToTargetSize(
    canvas: HTMLCanvasElement,
    format: OutputFormat,
    targetMaxBytes: number
  ): Promise<{ blob: Blob; sizeBytes: number; qualityUsed: number }> {
    const mime = this.getMimeType(format);

    let low = 0.05;
    let high = 1.0;
    let bestBlob: Blob | null = null;
    let bestQuality = 0.8;
    let iterations = 0;

    while (low <= high && iterations < 7) {
      iterations++;
      const midQuality = Number(((low + high) / 2).toFixed(2));

      const currentBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), mime, midQuality);
      });

      if (currentBlob.size <= targetMaxBytes) {
        bestBlob = currentBlob;
        bestQuality = Math.round(midQuality * 100);
        low = midQuality + 0.05; // Try slightly higher quality if under limit
      } else {
        high = midQuality - 0.05; // Need stronger compression
      }
    }

    // Fallback if unable to get under limit with quality adjustment alone
    if (!bestBlob) {
      bestBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), mime, 0.05);
      });
      bestQuality = 5;
    }

    return {
      blob: bestBlob,
      sizeBytes: bestBlob.size,
      qualityUsed: bestQuality
    };
  }

  /**
   * Helper to format human-readable file sizes
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getMimeType(format: OutputFormat): string {
    switch (format) {
      case 'png': return 'image/png';
      case 'webp': return 'image/webp';
      case 'jpg':
      default:
        return 'image/jpeg';
    }
  }
}

export const imageCompressorService = new ImageCompressorService();
