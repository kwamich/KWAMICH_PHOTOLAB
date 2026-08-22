import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, AlertCircle, Sparkles } from 'lucide-react';
import type { ActiveImage } from '../../types';

interface UploadZoneProps {
  onImageSelected: (activeImage: ActiveImage) => void;
  title?: string;
  subtitle?: string;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onImageSelected,
  title = "Drag & drop your portrait or photo here",
  subtitle = "Supports JPG, JPEG, PNG, and WebP formats up to 50 MB"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setErrorMsg(null);

    // File validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg('Unsupported format. Please select a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('Image file size is too large (over 50 MB). Please choose a smaller image.');
      return;
    }

    setIsLoading(true);

    try {
      const objectUrl = URL.createObjectURL(file);

      // Load image into Image element to read dimensions safely
      const img = new Image();
      img.onload = () => {
        const metadata = {
          name: file.name,
          sizeBytes: file.size,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          type: file.type,
          aspectRatio: (img.naturalWidth || img.width) / (img.naturalHeight || img.height)
        };

        // Create dataUrl for instant canvas rendering
        const canvas = document.createElement('canvas');
        canvas.width = metadata.width;
        canvas.height = metadata.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL(file.type, 0.95);

        setIsLoading(false);
        onImageSelected({
          file,
          objectUrl,
          dataUrl,
          metadata
        });
      };

      img.onerror = () => {
        setIsLoading(false);
        setErrorMsg('Unable to read this image file. It may be corrupted or unreadable.');
      };

      img.src = objectUrl;
    } catch (err) {
      setIsLoading(false);
      setErrorMsg('An error occurred while loading the image. Please try again.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Demo sample photo option for rapid testing
  const loadSamplePhoto = () => {
    setIsLoading(true);
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d')!;

    // Create studio portrait background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1400);
    bgGrad.addColorStop(0, '#38bdf8');
    bgGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1400);

    // Draw stylized studio subject avatar
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(600, 480, 220, 0, Math.PI * 2); // head
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(600, 1150, 420, 500, 0, Math.PI, 0); // shoulders
    ctx.fill();

    canvas.toBlob((blob) => {
      if (blob) {
        const sampleFile = new File([blob], 'kwamich_sample_portrait.jpg', { type: 'image/jpeg' });
        processFile(sampleFile);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Choose Photo</span>
            </button>
            
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                loadSamplePhoto();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Try Sample Portrait</span>
            </button>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium pt-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Preparing image workspace...</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/60 p-3 rounded-xl border border-red-200 dark:border-red-800 mt-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
