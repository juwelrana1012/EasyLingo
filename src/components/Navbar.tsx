import React, { useEffect, useState } from 'react';
import { ArrowRight, Home, Loader2, MoreVertical, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Logo, PROFILE_AVATAR_SRC } from './Logo';

export function Navbar() {
  const {
    view,
    enterWorkspace,
    goHome,
    openLanguagePage,
    openThemesPage,
    translatingUi,
    t,
  } = useApp();

  const { isInstalled, installDirectly } = usePWAInstall();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const handleDirectInstall = async () => {
    setMenuOpen(false);
    await installDirectly();
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full backdrop-blur border-b lb-surface lb-border"
        style={{ backgroundColor: 'color-mix(in srgb, var(--lb-surface) 92%, transparent)' }}
      >
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goHome}
            className="focus:outline-none cursor-pointer"
            aria-label="EasyLingo Home"
          >
            <Logo />
          </button>

          <div className="flex items-center gap-2.5 shrink-0 relative">
            {translatingUi && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium lb-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Translating...</span>
              </span>
            )}

            {view === 'home' ? (
              <button
                type="button"
                onClick={() => enterWorkspace('word-meaning')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer lb-btn-primary whitespace-nowrap"
              >
                <span>{t('getStarted')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={goHome}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors cursor-pointer lb-surface lb-border lb-text hover:opacity-85 whitespace-nowrap"
              >
                <Home className="w-4 h-4" style={{ color: 'var(--lb-primary)' }} />
                <span>{t('backHome')}</span>
              </button>
            )}

            {/* Three-Dot Menu Button */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="p-2.5 rounded-xl lb-surface lb-text hover:opacity-75 transition-opacity cursor-pointer"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Full-height (top-to-bottom) floating right menu covering 1/4 of the display width */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[1px]"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              role="menu"
              aria-label="Menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-1/4 min-w-[160px] lb-surface shadow-2xl flex flex-col"
            >
              <div className="relative pt-5 pb-3 px-3 sm:px-5 flex flex-wrap items-center justify-center sm:justify-start gap-2.5 shrink-0 pr-9">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-xl lb-text hover:opacity-70 transition-opacity cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-md shrink-0">
                  <img
                    src={PROFILE_AVATAR_SRC}
                    alt="EasyLingo Profile"
                    className="w-full h-full object-cover object-center scale-[1.03]"
                  />
                </div>
                <span className="text-sm sm:text-base font-extrabold tracking-tight lb-text whitespace-nowrap">
                  Easy<span style={{ color: 'var(--lb-primary)' }}>Lingo</span>
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-2 flex flex-col gap-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    openLanguagePage();
                  }}
                  className="w-full text-left px-3 py-3 text-sm sm:text-base font-semibold lb-text hover:opacity-70 transition-opacity cursor-pointer"
                >
                  {t('menuSimpleLanguage')}
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    openThemesPage();
                  }}
                  className="w-full text-left px-3 py-3 text-sm sm:text-base font-semibold lb-text hover:opacity-70 transition-opacity cursor-pointer"
                >
                  {t('menuSimpleTheme')}
                </button>

                {!isInstalled && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleDirectInstall}
                    className="w-full text-left px-3 py-3 text-sm sm:text-base font-semibold lb-text hover:opacity-70 transition-opacity cursor-pointer"
                  >
                    {t('menuInstallWeb')}
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
