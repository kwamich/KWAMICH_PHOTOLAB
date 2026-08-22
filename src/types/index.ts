export type PhysicalUnit = 'px' | 'in' | 'cm' | 'mm';

export type OutputFormat = 'jpg' | 'png' | 'webp';

export type ToolType = 
  | 'passport' 
  | 'background' 
  | 'resize' 
  | 'compress' 
  | 'crop' 
  | 'converter' 
  | 'enhancer' 
  | 'sheet';

export interface ImageMetadata {
  name: string;
  sizeBytes: number;
  width: number;
  height: number;
  type: string;
  aspectRatio: number;
}

export interface ActiveImage {
  file: File;
  objectUrl: string;
  dataUrl: string;
  metadata: ImageMetadata;
}

export interface PassportPreset {
  id: string;
  name: string;
  country: string;
  flag: string;
  width: number;
  height: number;
  unit: PhysicalUnit;
  dpi: number;
  pixelWidth: number;
  pixelHeight: number;
  recommendedBackground: string;
  backgroundColorHex: string;
  maxSizeBytes?: number;
  fileFormat: OutputFormat;
  notes: string;
  officialUrl?: string;
  dateVerified?: string;
}

export interface ResizeConfig {
  unit: PhysicalUnit;
  width: number;
  height: number;
  dpi: number;
  maintainAspectRatio: boolean;
  fitMode: 'fit' | 'fill' | 'stretch';
}

export interface CompressionConfig {
  format: OutputFormat;
  quality: number; // 0 to 100
  targetMaxSizeBytes?: number; // optional exact byte limit (e.g. 500 * 1024)
}

export interface EnhancementConfig {
  brightness: number;  // -100 to 100
  contrast: number;    // -100 to 100
  saturation: number;  // -100 to 100
  sharpness: number;   // 0 to 100
  warmth: number;      // -100 to 100
  exposure: number;    // -100 to 100
  grayscale: boolean;
}

export interface PaperSize {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  widthIn: number;
  heightIn: number;
}

export interface SheetConfig {
  paperSizeId: string;
  copyCount: number;
  spacingMm: number;
  marginMm: number;
  showCropMarks: boolean;
  centerSheet: boolean;
}

export interface FaceGuidanceResult {
  hasFace: boolean;
  isCentered: boolean;
  headRatioOk: boolean;
  lightingOk: boolean;
  warnings: string[];
  tips: string[];
}

export interface ProcessingStatus {
  isProcessing: boolean;
  progress: number; // 0 - 100
  message: string;
  error?: string;
}
