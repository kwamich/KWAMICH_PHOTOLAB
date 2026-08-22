import React from 'react';
import { 
  Camera, Wand2, Scaling, FileArchive, Crop, ArrowRightLeft, Sparkles, Printer, 
  ShieldCheck, Zap, Lock, ArrowRight 
} from 'lucide-react';
import { UploadZone } from '../../components/common/UploadZone';
import type { ActiveImage, ToolType } from '../../types';

interface LandingPageProps {
  onImageSelected: (activeImage: ActiveImage, targetTool?: ToolType) => void;
  onOpenStudio: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onImageSelected,
  onOpenStudio
}) => {
  
  const QUICK_TOOLS: {
    id: ToolType;
    title: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: 'passport',
      title: 'Passport Photo Maker',
      description: 'Create properly sized passport and ID photos with verified country presets.',
      icon: <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      badge: 'Popular'
    },
    {
      id: 'background',
      title: 'AI Background Remover',
      description: 'Remove and replace photo backgrounds locally in your browser with studio colors.',
      icon: <Wand2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
      badge: 'AI Powered'
    },
    {
      id: 'resize',
      title: 'Custom Image Resizer',
      description: 'Resize images using pixels, inches, centimetres, or millimetres and DPI.',
      icon: <Scaling className="w-6 h-6 text-sky-600 dark:text-sky-400" />
    },
    {
      id: 'compress',
      title: 'Smart Image Compressor',
      description: 'Reduce file size or compress to an exact target KB limit (e.g. 500 KB).',
      icon: <FileArchive className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
    },
    {
      id: 'crop',
      title: 'Photo Cropper',
      description: 'Crop, rotate, and align portraits to exact passport framing ratios.',
      icon: <Crop className="w-6 h-6 text-amber-600 dark:text-amber-400" />
    },
    {
      id: 'converter',
      title: 'Format Converter',
      description: 'Convert between JPG, PNG, and WebP while preserving quality.',
      icon: <ArrowRightLeft className="w-6 h-6 text-purple-600 dark:text-purple-400" />
    },
    {
      id: 'sheet',
      title: 'Passport Sheet Maker',
      description: 'Arrange multiple copies on printable paper (A4, 4×6") with PDF export.',
      icon: <Printer className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
      badge: 'Print Shop'
    },
    {
      id: 'enhancer',
      title: 'Photo Enhancer',
      description: 'Make controlled brightness, contrast, sharpness, and warmth adjustments.',
      icon: <Sparkles className="w-6 h-6 text-teal-600 dark:text-teal-400" />
    }
  ];

  return (
    <div className="space-y-16 py-8 sm:py-12">
      
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto px-4">
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>100% Browser Local Processing • Privacy Preserved</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
          Professional Image Tools. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
            One Simple Workspace.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Create passport photos, remove backgrounds, resize images, compress files and prepare photos for printing — directly in your browser.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onOpenStudio}
            className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all flex items-center gap-2"
          >
            <span>Start Editing Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <a
            href="#quick-tools"
            className="px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm border border-slate-200 dark:border-slate-700 transition-colors"
          >
            Explore Quick Tools
          </a>
        </div>
      </section>

      {/* Main Upload Dropzone */}
      <section className="px-4">
        <UploadZone onImageSelected={(img) => onImageSelected(img)} />
      </section>

      {/* Quick Tool Cards Section */}
      <section id="quick-tools" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-8">
        
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            Quick Tools for Fast Editing
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select any tool to quickly edit a photo or launch the full Photo Studio editor.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {QUICK_TOOLS.map((tool) => (
            <div
              key={tool.id}
              onClick={() => {
                // If user clicks tool card, prompt upload for that tool
                const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (fileInput) fileInput.click();
              }}
              className="group relative p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {tool.icon}
                  </div>
                  {tool.badge && (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                      {tool.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                <span>Open Tool</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* Product Feature Highlights & Privacy Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 rounded-3xl bg-slate-900 text-slate-100 space-y-12">
        
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            Enterprise Grade Architecture
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold">
            Everything you need for professional photos
          </h2>
          <p className="text-sm text-slate-400">
            Engineered for high-volume commercial print shops and privacy-conscious users.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">100% Local Privacy</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your photos never leave your device. All rendering, AI background removal, and compression occur locally inside your browser memory.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">Print Shop Sheets</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatically calculate optimal photo grids on 4×6", 5×7", A4, or Letter paper. Export print-ready PDFs with crop marks.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">Target Size Compression</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Set exact maximum file size caps (e.g. 240 KB for US Passport or 500 KB for government forms) and let our engine handle quality adjustments.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
};
