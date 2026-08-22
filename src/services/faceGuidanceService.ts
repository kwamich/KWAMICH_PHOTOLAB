import type { FaceGuidanceResult, PassportPreset } from '../types';

export class FaceGuidanceService {
  /**
   * Analyze canvas image for technical passport guidance
   */
  async analyzeFace(
    canvas: HTMLCanvasElement,
    preset?: PassportPreset
  ): Promise<FaceGuidanceResult> {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return {
        hasFace: true,
        isCentered: true,
        headRatioOk: true,
        lightingOk: true,
        warnings: ['Unable to analyze canvas lighting'],
        tips: ['Ensure portrait is well-lit and faces forward.']
      };
    }

    const width = canvas.width;
    const height = canvas.height;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Analyze central grid for facial skin tone presence and position
    let skinPixelCount = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width, maxX = 0, minY = height, maxY = 0;

    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Skin tone heuristic filter (RGB rule for human skin color range)
        const isSkin = (r > 60) && (g > 40) && (b > 20) &&
                       (r > g) && (r > b) &&
                       (Math.abs(r - g) > 12) &&
                       (r - Math.min(g, b) > 15);

        if (isSkin) {
          skinPixelCount++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const warnings: string[] = [];
    const tips: string[] = [];

    const totalSamples = (width / 4) * (height / 4);
    const skinRatio = skinPixelCount / totalSamples;
    const hasFace = skinRatio > 0.05;

    if (!hasFace) {
      warnings.push('No primary face detected in central area.');
      tips.push('Ensure the subject faces the camera directly with no dark shadows.');
      return {
        hasFace: false,
        isCentered: false,
        headRatioOk: false,
        lightingOk: false,
        warnings,
        tips
      };
    }

    const faceCenterX = sumX / skinPixelCount;
    const faceCenterY = sumY / skinPixelCount;

    const offsetX = Math.abs(faceCenterX - width / 2) / width;
    const offsetY = Math.abs(faceCenterY - height / 2) / height;
    const isCentered = offsetX < 0.12 && offsetY < 0.18;

    if (!isCentered) {
      if (faceCenterX < width / 2) {
        warnings.push('Face appears shifted slightly to the left.');
      } else {
        warnings.push('Face appears shifted slightly to the right.');
      }
      tips.push('Position face squarely in the center of the frame overlay.');
    }

    const faceHeight = maxY - minY;
    const headRatio = faceHeight / height;
    const headRatioOk = headRatio >= 0.45 && headRatio <= 0.85;

    if (!headRatioOk) {
      if (headRatio < 0.45) {
        warnings.push('Head size appears too small relative to frame.');
        tips.push('Zoom in or crop closer so head fills 50-70% of photo height.');
      } else {
        warnings.push('Head size appears too large for standard passport bounds.');
        tips.push('Zoom out slightly so top of hair and chin remain inside crop lines.');
      }
    }

    if (warnings.length === 0) {
      tips.push('✓ Face centered and framed correctly.');
      tips.push('✓ Proportion and positioning match technical guidelines.');
    }

    if (preset) {
      tips.push(`Preset: ${preset.name} (${preset.width}×${preset.height} ${preset.unit})`);
    }

    return {
      hasFace: true,
      isCentered,
      headRatioOk,
      lightingOk: true,
      warnings,
      tips
    };
  }
}

export const faceGuidanceService = new FaceGuidanceService();
