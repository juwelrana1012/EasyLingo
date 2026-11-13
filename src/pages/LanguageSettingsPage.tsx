import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getFlagEmoji, WORLD_COUNTRIES_195 } from '../data/worldCountries';

export function LanguageSettingsPage() {
  const {
    selectedCountry,
    selectCountryLanguage,
    translatingUi,
    goBackFromSettings,
    t,
  } = useApp();

  const [search, setSearch] = useState('');

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return WORLD_COUNTRIES_195;
    return WORLD_COUNTRIES_195.filter(
      (c) =>
        c.country.toLowerCase().includes(q) ||
        c.language.toLowerCase().includes(q) ||
        c.nativeName.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="max-w-[1140px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Top Bar — Completely Borderless */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBackFromSettings}
          className="inline-flex items-center gap-1.5 py-1 text-xs sm:text-sm font-medium lb-text hover:opacity-70 transition-opacity cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" style={{ color: 'var(--lb-primary)' }} />
          <span>{t('backBtn')}</span>
        </button>

        {/* Minimal Borderless Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 lb-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchCountryPlaceholder')}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg lb-text text-xs font-normal focus:outline-none"
            style={{ backgroundColor: 'color-mix(in srgb, var(--lb-text) 7%, transparent)' }}
          />
        </div>
      </div>

      {/* Single-Line Header Text — No Card, No Border */}
      <div className="flex items-center justify-between gap-3 overflow-hidden">
        <p className="text-xs sm:text-sm font-normal lb-text truncate">
          {t('languagePageSubtitle')}
        </p>

        {translatingUi ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-normal shrink-0"
            style={{ color: 'var(--lb-primary)' }}
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{selectedCountry.language}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-normal lb-muted shrink-0">
            <span className="text-sm leading-none">{getFlagEmoji(selectedCountry.iso2)}</span>
            <span>{selectedCountry.language}</span>
          </span>
        )}
      </div>

      {/* 195 Countries Slim Borderless List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1">
        {filteredCountries.map((country) => {
          const isSelected = selectedCountry.iso2 === country.iso2;
          return (
            <button
              key={country.iso2}
              type="button"
              onClick={() => selectCountryLanguage(country)}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left hover:opacity-75 transition-opacity cursor-pointer min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none shrink-0" aria-hidden="true">
                  {getFlagEmoji(country.iso2)}
                </span>
                <span
                  className={`text-xs truncate ${
                    isSelected ? 'font-semibold' : 'font-normal lb-text'
                  }`}
                  style={isSelected ? { color: 'var(--lb-primary)' } : undefined}
                >
                  {country.country}
                </span>
                <span className="text-[11px] font-light lb-muted truncate hidden sm:inline">
                  · {country.language}
                </span>
              </div>

              {isSelected && (
                <Check
                  className="w-3.5 h-3.5 shrink-0 stroke-[2.5]"
                  style={{ color: 'var(--lb-primary)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

