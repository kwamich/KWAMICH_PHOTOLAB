import React from 'react';
import { Camera, ShieldCheck, Lock, Cpu, Globe } from 'lucide-react';

interface FooterProps {
  onNavigateView: (view: 'landing' | 'studio') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateView }) => {
  return (
    <footer className="w-full bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        
        {/* Brand info */}
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </div>
            <span>KWAMICH PHOTOLAB</span>
          </div>
          <p className="text-slate-400 text-sm max-w-md leading-relaxed">
            Professional browser-based image and passport photo processing engine built for commercial print shops and individual creators.
          </p>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium pt-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Image processing is performed 100% locally in your browser whenever possible.</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">Quick Navigation</h4>
          <ul className="space-y-2">
            <li>
              <button onClick={() => onNavigateView('landing')} className="hover:text-blue-400 transition-colors">
                Home & Quick Tools
              </button>
            </li>
            <li>
              <button onClick={() => onNavigateView('studio')} className="hover:text-blue-400 transition-colors">
                Photo Studio Editor
              </button>
            </li>
            <li>
              <span className="text-slate-500 hover:text-slate-400 cursor-pointer">Passport Preset Index</span>
            </li>
            <li>
              <span className="text-slate-500 hover:text-slate-400 cursor-pointer">Print Sheet Calculator</span>
            </li>
          </ul>
        </div>

        {/* Brand & Privacy */}
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">Kwamich Tech</h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-1.5 text-slate-400">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Zero Upload Guarantee</span>
            </li>
            <li className="flex items-center gap-1.5 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Client-Side Canvas & AI</span>
            </li>
            <li className="flex items-center gap-1.5 text-slate-400">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>PWA Offline Compatible</span>
            </li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
        <div>
          © {new Date().getFullYear()} <span className="font-semibold text-slate-400">Kwamich PhotoLab</span>. All rights reserved. Powered by <span className="font-semibold text-slate-300">Kwamich Tech</span>.
        </div>
        <div className="flex items-center gap-6">
          <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
          <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
          <span className="hover:text-slate-400 cursor-pointer">Official Requirements Disclaimer</span>
        </div>
      </div>
    </footer>
  );
};
