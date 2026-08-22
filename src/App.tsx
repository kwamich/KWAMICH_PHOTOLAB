import { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { LandingPage } from './features/landing/LandingPage';
import { PhotoStudio } from './features/studio/PhotoStudio';
import type { ActiveImage } from './types';

export function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'studio'>('landing');
  const [activeImage, setActiveImage] = useState<ActiveImage | null>(null);
  
  // Theme state persisted in localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('kwamich_theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kwamich_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kwamich_theme', 'light');
    }
  }, [isDarkMode]);

  const handleImageSelected = (image: ActiveImage) => {
    setActiveImage(image);
    setCurrentView('studio');
  };

  const handleResetImage = () => {
    if (activeImage?.objectUrl) {
      URL.revokeObjectURL(activeImage.objectUrl);
    }
    setActiveImage(null);
    setCurrentView('landing');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Global Header */}
      <Header
        currentView={currentView}
        onNavigateView={(view) => setCurrentView(view)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        hasActiveImage={!!activeImage}
        onResetImage={handleResetImage}
      />

      {/* Main Content */}
      <div className="flex-1">
        {currentView === 'landing' ? (
          <LandingPage
            onImageSelected={handleImageSelected}
            onOpenStudio={() => setCurrentView('studio')}
          />
        ) : (
          <PhotoStudio
            activeImage={activeImage}
            onImageSelected={handleImageSelected}
            onReset={handleResetImage}
          />
        )}
      </div>

      {/* Global Footer (shown on landing or non-fullscreen views) */}
      {currentView === 'landing' && (
        <Footer onNavigateView={(view) => setCurrentView(view)} />
      )}

    </div>
  );
}

export default App;
