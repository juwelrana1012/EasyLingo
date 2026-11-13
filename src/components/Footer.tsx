import React from 'react';
import { useApp } from '../context/AppContext';
import { Logo } from './Logo';

export function Footer() {
  const { t } = useApp();

  return (
    <footer className="relative z-10 lb-surface border-t lb-border">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <Logo showTagline taglineText={t('brandTagline')} />
          <p className="text-xs sm:text-sm lb-muted max-w-md font-bengali">{t('footerDesc')}</p>
        </div>
        <p className="text-xs lb-muted whitespace-nowrap">
          © {new Date().getFullYear()} EasyLingo. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
