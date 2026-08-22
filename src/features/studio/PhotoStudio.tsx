import React, { useState, useCallback } from 'react';
import type { ActiveImage, CompressionConfig, EnhancementConfig, PassportPreset, ResizeConfig, ToolType } from '../../types';
import { PassportPhotoTool } from '../tools/PassportPhotoTool';
import { BackgroundRemoverTool } from '../tools/BackgroundRemoverTool';
import { ImageResizerTool } from '../tools/ImageResizerTool';
import { ImageCompressorTool } from '../tools/ImageCompressorTool';
import { PhotoCropperTool } from '../tools/PhotoCropperTool';
import { ImageConverterTool } from '../tools/ImageConverterTool';
import { PhotoEnhancerTool } from '../tools/PhotoEnhancerTool';
import { PassportSheetMakerTool } from '../tools/PassportSheetMakerTool';
import { UploadZone } from '../../components/common/UploadZone';
import { BeforeAfterSlider } from '../../components/common/BeforeAfterSlider';
import { TransformCanvas } from '../../components/common/TransformCanvas';
import type { TransformState } from '../../components/common/TransformCanvas';
import { 
  Camera, Wand2, Scaling, FileArchive, Crop, ArrowRightLeft, Sparkles, Printer, 
  Download, SlidersHorizontal, Image as ImageIcon, RotateCcw, ChevronDown 
} from 'lucide-react';
import { imageCompressorService } from '../../services/imageCompressorService';
import confetti from 'canvas-confetti';

interface PhotoStudioProps {
  activeImage: ActiveImage | null;
  onImageSelected: (img: ActiveImage) => void;
  onReset: () => void;
}

export const PhotoStudio: React.FC<PhotoStudioProps> = ({
  activeImage,
  onImageSelected,
  onReset
}) => {
  const [activeTool, setActiveTool] = useState<ToolType>('passport');
  const [activePreset, setActivePreset] = useState<PassportPreset | undefined>(undefined);
  
  // Track processed result state
  const [processedObjectUrl, setProcessedObjectUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [showBeforeAfter, setShowBeforeAfter] = useState<boolean>(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState<boolean>(true);

  // Transform canvas state (for the resize tool)
  const [liveTransform, setLiveTransform] = useState<TransformState | null>(null);
  const [inspectorOverride, setInspectorOverride] = useState<Partial<TransformState> | undefined>(undefined);

  const handleTransformChange = useCallback((t: TransformState) => {
    setLiveTransform(t);
  }, []);

  const handleTransformCommit = useCallback((canvas: HTMLCanvasElement) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        handleUpdateImageResult(blob, url);
      }
    }, 'image/png', 1);
  }, []);

  const handleInspectorChange = useCallback((partial: Partial<TransformState>) => {
    setInspectorOverride(partial);
  }, []);

  if (!activeImage) {
    return (
      <div className="py-12 px-4 max-w-4xl mx-auto space-y-6 text-center">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Upload an image to open the Photo Studio
        </h2>
        <UploadZone onImageSelected={onImageSelected} />
      </div>
    );
  }

  const currentDisplayUrl = processedObjectUrl || activeImage.objectUrl;

  const handleUpdateImageResult = (newBlob: Blob, newObjectUrl: string) => {
    setProcessedBlob(newBlob);
    setProcessedObjectUrl(newObjectUrl);
  };

  const handleApplyPreset = (preset: PassportPreset) => {
    setActivePreset(preset);
  };

  const handleApplyResize = (_config: ResizeConfig, resizedCanvas: HTMLCanvasElement) => {
    resizedCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        handleUpdateImageResult(blob, url);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleApplyCompression = (_config: CompressionConfig, compressedBlob: Blob) => {
    const url = URL.createObjectURL(compressedBlob);
    handleUpdateImageResult(compressedBlob, url);
  };

  const handleApplyCrop = (croppedCanvas: HTMLCanvasElement) => {
    croppedCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        handleUpdateImageResult(blob, url);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleApplyConversion = (convertedBlob: Blob) => {
    const url = URL.createObjectURL(convertedBlob);
    handleUpdateImageResult(convertedBlob, url);
  };

  const handleApplyEnhancement = (_config: EnhancementConfig, enhancedCanvas: HTMLCanvasElement) => {
    enhancedCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        handleUpdateImageResult(blob, url);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleDownloadMainImage = () => {
    const a = document.createElement('a');
    a.href = currentDisplayUrl;
    a.download = `KwamichPhotoLab_${activeTool}_output.jpg`;
    a.click();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
  };

  const TOOLS_LIST: { id: ToolType; label: string; icon: React.ReactNode }[] = [
    { id: 'passport', label: 'Passport', icon: <Camera className="w-4 h-4" /> },
    { id: 'background', label: 'Background', icon: <Wand2 className="w-4 h-4" /> },
    { id: 'crop', label: 'Crop', icon: <Crop className="w-4 h-4" /> },
    { id: 'resize', label: 'Resize', icon: <Scaling className="w-4 h-4" /> },
    { id: 'compress', label: 'Compress', icon: <FileArchive className="w-4 h-4" /> },
    { id: 'enhancer', label: 'Enhance', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'converter', label: 'Convert', icon: <ArrowRightLeft className="w-4 h-4" /> },
    { id: 'sheet', label: 'Print Sheet', icon: <Printer className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
      
      {/* Main 3-Column Studio Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT TOOL NAVIGATION SIDEBAR */}
        <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Studio Tools
          </div>
          {TOOLS_LIST.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`w-full px-3 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2.5 ${
                activeTool === tool.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          ))}
        </aside>

        {/* CENTER IMAGE CANVAS WORKSPACE */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-200/50 dark:bg-slate-900/50 checker-bg">
          
          {/* Canvas Toolbar controls */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            
            {/* File info badge */}
            <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm">
              <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>{activeImage.metadata.width} × {activeImage.metadata.height} px</span>
              <span className="text-slate-400">|</span>
              <span>{imageCompressorService.formatFileSize(processedBlob?.size || activeImage.metadata.sizeBytes)}</span>
            </div>

            {/* Before / After comparison toggle */}
            {processedObjectUrl && (
              <button
                onClick={() => setShowBeforeAfter(!showBeforeAfter)}
                className="pointer-events-auto px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-xs font-bold text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-white transition-colors flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showBeforeAfter ? 'Hide Comparison' : 'Compare Before / After'}</span>
              </button>
            )}
          </div>

          {/* Main Image Display / Transform Canvas / Split Slider */}
          <div className="w-full h-full max-h-[calc(100vh-12rem)] flex items-center justify-center p-6">
            {/* Interactive Transform Canvas when resize tool is active */}
            {activeTool === 'resize' ? (
              <div className="w-full h-full relative">
                <TransformCanvas
                  imageUrl={currentDisplayUrl}
                  naturalWidth={activeImage.metadata.width}
                  naturalHeight={activeImage.metadata.height}
                  onChange={handleTransformChange}
                  onCommit={handleTransformCommit}
                  externalTransform={inspectorOverride}
                  maintainAspect={true}
                />
              </div>
            ) : showBeforeAfter && processedObjectUrl ? (
              <BeforeAfterSlider
                beforeUrl={activeImage.objectUrl}
                afterUrl={processedObjectUrl}
                className="max-w-2xl max-h-full aspect-auto shadow-2xl"
              />
            ) : (
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                <img
                  src={currentDisplayUrl}
                  alt="Active Studio Preview"
                  className="max-w-full max-h-[calc(100vh-14rem)] object-contain rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-800"
                />

                {/* Passport Framing Overlay Guide when Passport Tool Active */}
                {activeTool === 'passport' && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-48 h-60 border-2 border-dashed border-blue-500/80 rounded-2xl flex flex-col items-center justify-between p-4 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                      <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        Head Top
                      </span>
                      <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        Chin Line
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </main>

        {/* RIGHT SETTINGS INSPECTOR PANEL */}
        <aside className="hidden lg:block w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto">
          {activeTool === 'passport' && (
            <PassportPhotoTool
              activeImage={activeImage}
              onApplyPreset={handleApplyPreset}
              onNavigateToTool={(t) => setActiveTool(t as ToolType)}
            />
          )}

          {activeTool === 'background' && (
            <BackgroundRemoverTool
              activeImage={activeImage}
              onUpdateImageResult={handleUpdateImageResult}
            />
          )}

          {activeTool === 'resize' && (
            <ImageResizerTool
              activeImage={activeImage}
              onApplyResize={handleApplyResize}
              liveTransform={liveTransform}
              onInspectorChange={handleInspectorChange}
            />
          )}

          {activeTool === 'compress' && (
            <ImageCompressorTool
              activeImage={activeImage}
              onApplyCompression={handleApplyCompression}
            />
          )}

          {activeTool === 'crop' && (
            <PhotoCropperTool
              activeImage={activeImage}
              onApplyCrop={handleApplyCrop}
            />
          )}

          {activeTool === 'converter' && (
            <ImageConverterTool
              activeImage={activeImage}
              onApplyConversion={handleApplyConversion}
            />
          )}

          {activeTool === 'enhancer' && (
            <PhotoEnhancerTool
              activeImage={activeImage}
              onApplyEnhancement={handleApplyEnhancement}
            />
          )}

          {activeTool === 'sheet' && (
            <PassportSheetMakerTool
              activeImage={activeImage}
              activePreset={activePreset}
            />
          )}
        </aside>

      </div>

      {/* MOBILE BOTTOM TOOL SELECTOR & DRAWER */}
      <div className="lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        
        {/* Mobile Horizontal Tool Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
          {TOOLS_LIST.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                setIsMobilePanelOpen(true);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                activeTool === tool.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          ))}
        </div>

        {/* Mobile Drawer Panel */}
        {isMobilePanelOpen && (
          <div className="p-4 max-h-72 overflow-y-auto">
            <div className="flex justify-between items-center pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                {activeTool} Settings
              </span>
              <button
                onClick={() => setIsMobilePanelOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {activeTool === 'passport' && (
              <PassportPhotoTool activeImage={activeImage} onApplyPreset={handleApplyPreset} onNavigateToTool={(t) => setActiveTool(t as ToolType)} />
            )}
            {activeTool === 'background' && (
              <BackgroundRemoverTool activeImage={activeImage} onUpdateImageResult={handleUpdateImageResult} />
            )}
            {activeTool === 'resize' && (
              <ImageResizerTool activeImage={activeImage} onApplyResize={handleApplyResize} liveTransform={liveTransform} onInspectorChange={handleInspectorChange} />
            )}
            {activeTool === 'compress' && (
              <ImageCompressorTool activeImage={activeImage} onApplyCompression={handleApplyCompression} />
            )}
            {activeTool === 'crop' && (
              <PhotoCropperTool activeImage={activeImage} onApplyCrop={handleApplyCrop} />
            )}
            {activeTool === 'converter' && (
              <ImageConverterTool activeImage={activeImage} onApplyConversion={handleApplyConversion} />
            )}
            {activeTool === 'enhancer' && (
              <PhotoEnhancerTool activeImage={activeImage} onApplyEnhancement={handleApplyEnhancement} />
            )}
            {activeTool === 'sheet' && (
              <PassportSheetMakerTool activeImage={activeImage} activePreset={activePreset} />
            )}
          </div>
        )}
      </div>

      {/* BOTTOM GLOBAL EXPORT & CONTROL BAR */}
      <footer className="h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-30">
        
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="text-slate-500 dark:text-slate-400">
            Original: <span className="text-slate-800 dark:text-slate-200 font-bold">{imageCompressorService.formatFileSize(activeImage.metadata.sizeBytes)}</span>
          </div>
          <div className="text-slate-500 dark:text-slate-400">
            Output: <span className="text-blue-600 dark:text-blue-400 font-extrabold">{imageCompressorService.formatFileSize(processedBlob?.size || activeImage.metadata.sizeBytes)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>

          <button
            onClick={handleDownloadMainImage}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Processed Image</span>
          </button>
        </div>

      </footer>

    </div>
  );
};
