import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { APP_THEMES } from '../data/themes';

export function ThemesSettingsPage() {
  const { activeTheme, setThemeById, goBackFromSettings, t } = useApp();

  return (
    <div className="max-w-[920px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div>
        <button
          type="button"
          onClick={goBackFromSettings}
          aria-label={t('backBtn')}
          className="p-1.5 lb-text hover:opacity-70 transition-opacity cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--lb-primary)' }} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {APP_THEMES.map((th) => {
          const isSelected = activeTheme.id === th.id;
          const checkColor = th.id === 'fresh-white' || th.id === 'alabaster-slate' ? '#111827' : '#FFFFFF';

          return (
            <button
              key={th.id}
              type="button"
              onClick={() => setThemeById(th.id)}
              aria-label={th.id}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-transform hover:scale-108 active:scale-95 cursor-pointer shrink-0"
              style={{
                background: th.swatch,
                boxShadow: isSelected
                  ? '0 0 0 2.5px var(--lb-bg), 0 0 0 4.5px var(--lb-primary), 0 6px 14px rgba(0,0,0,0.22)'
                  : '0 2px 8px rgba(0,0,0,0.16)',
              }}
            >
              {isSelected && <Check className="w-4 h-4 stroke-[3]" style={{ color: checkColor }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
