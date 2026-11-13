import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Bookmark,
  Check,
  Copy,
  History,
  Loader2,
  Trash2,
  Volume2,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getFlagEmoji, WORLD_COUNTRIES_195 } from '../data/worldCountries';
import { getFastCache, setFastCache } from '../utils/fastCache';
import { isSpeechSynthesisSupported, speakText } from '../utils/speech';

interface TranslateResult {
  translatedText: string;
  detectedLanguage: string;
  transliteration: string;
  notes: string;
}

export function TranslatorPage() {
  const { data, recordTranslation, toggleSaveTranslation, isTranslationSaved } = useApp();
  const [sourceLang, setSourceLang] = useState('Auto Detect');
  const [targetLang, setTargetLang] = useState('Bengali (Bangladesh)');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLang, setDetectedLang] = useState('');
  const [transliteration, setTransliteration] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [instantMode, setInstantMode] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // All 195 country languages formatted cleanly
  const countryOptions = useMemo(
    () =>
      WORLD_COUNTRIES_195.map((c) => ({
        value: `${c.language} (${c.country})`,
        label: `${getFlagEmoji(c.iso2)} ${c.country} — ${c.language} (${c.nativeName})`,
        bcp47: c.bcp47,
      })),
    []
  );

  const handleSwap = () => {
    const nextSource = targetLang;
    const nextTarget =
      sourceLang === 'Auto Detect' ? 'English (United States)' : sourceLang;
    setSourceLang(nextSource);
    setTargetLang(nextTarget);
    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText(sourceText);
      setTransliteration('');
      setNotes('');
    }
  };

  const runTranslate = useCallback(
    async (textToTranslate: string, saveToHistory: boolean) => {
      const trimmed = textToTranslate.trim();
      if (!trimmed) {
        if (saveToHistory) setError('Please enter text to translate.');
        return;
      }

      const cacheKey = `${sourceLang}:${targetLang}:${trimmed}`;
      const cached = getFastCache<TranslateResult>('tr', cacheKey);
      if (cached) {
        setTranslatedText(cached.translatedText || '');
        setDetectedLang(cached.detectedLanguage || '');
        setTransliteration(cached.transliteration || '');
        setNotes(cached.notes || '');
        setError('');
        if (saveToHistory) {
          recordTranslation({
            sourceText: trimmed,
            translatedText: cached.translatedText || '',
            sourceLang: cached.detectedLanguage || sourceLang,
            targetLang,
          });
        }
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ text: trimmed, sourceLang, targetLang }),
        });
        const json = (await res.json()) as TranslateResult & { error?: string };
        if (!res.ok) throw new Error(json.error || 'Translation failed.');

        setFastCache('tr', cacheKey, json);
        setTranslatedText(json.translatedText || '');
        setDetectedLang(json.detectedLanguage || '');
        setTransliteration(json.transliteration || '');
        setNotes(json.notes || '');

        if (saveToHistory) {
          recordTranslation({
            sourceText: trimmed,
            translatedText: json.translatedText || '',
            sourceLang: json.detectedLanguage || sourceLang,
            targetLang,
          });
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Unable to complete translation.');
        }
      } finally {
        setLoading(false);
      }
    },
    [sourceLang, targetLang, recordTranslation]
  );

  const handleTranslate = () => runTranslate(sourceText, true);

  // Instant live auto-translate as the user types (380ms debounce)
  useEffect(() => {
    if (!instantMode) return;
    const trimmed = sourceText.trim();
    if (!trimmed) {
      setTranslatedText('');
      setDetectedLang('');
      setTransliteration('');
      setNotes('');
      return;
    }
    const timer = setTimeout(() => {
      runTranslate(trimmed, false);
    }, 380);
    return () => clearTimeout(timer);
  }, [sourceText, sourceLang, targetLang, instantMode, runTranslate]);

  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const resolveBcp47 = (val: string) => {
    const match = countryOptions.find((o) => o.value === val);
    return match?.bcp47;
  };

  const saved = Boolean(translatedText && isTranslationSaved(sourceText.trim(), translatedText));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold lb-text">195-Country Smart Translator</h2>
          <p className="text-sm lb-muted font-bengali mt-0.5">
            পৃথিবীর ১৯৫টি দেশের যেকোনো ভাষায় দ্রুত ও নির্ভুল অনুবাদ করুন।
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInstantMode((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold self-start cursor-pointer whitespace-nowrap ${
            instantMode ? 'lb-btn-primary border-transparent' : 'lb-surface lb-border lb-text'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{instantMode ? 'Instant Live Translate: ON' : 'Instant Live Translate: OFF'}</span>
        </button>
      </div>

      <div className="lb-surface border lb-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Language Pickers */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              aria-label="Source language"
              className="w-full px-4 py-2.5 rounded-xl lb-surface-alt border lb-border lb-text text-sm font-semibold focus:outline-none"
            >
              <option value="Auto Detect">🌐 Auto Detect (195 Languages)</option>
              {countryOptions.map((opt) => (
                <option key={`src-${opt.value}-${opt.label}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwap}
            className="self-center p-2.5 rounded-xl border lb-border lb-surface-alt cursor-pointer"
            style={{ color: 'var(--lb-primary)' }}
            aria-label="Swap languages"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          <div className="flex-1">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              aria-label="Target language"
              className="w-full px-4 py-2.5 rounded-xl lb-surface-alt border lb-border lb-text text-sm font-semibold focus:outline-none"
            >
              {countryOptions.map((opt) => (
                <option key={`tgt-${opt.value}-${opt.label}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Two Side-by-Side Translation Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col rounded-xl border lb-border lb-surface-alt overflow-hidden">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value.slice(0, 3500))}
              rows={7}
              placeholder="Type or paste text in any language..."
              className="w-full p-4 bg-transparent text-base lb-text resize-none focus:outline-none font-bengali"
            />
            <div className="px-4 py-2.5 border-t lb-border flex items-center justify-between text-xs lb-muted">
              <span className="tabular-nums">
                {sourceText.length}/3500{' '}
                {detectedLang && sourceLang === 'Auto Detect' ? `· Detected: ${detectedLang}` : ''}
              </span>
              <div className="flex items-center gap-2">
                {isSpeechSynthesisSupported() && sourceText.trim() && (
                  <button
                    type="button"
                    onClick={() => speakText(sourceText, resolveBcp47(sourceLang))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg lb-surface border lb-border lb-text font-medium cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" style={{ color: 'var(--lb-primary)' }} />
                    <span>Listen</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSourceText('');
                    setTranslatedText('');
                    setTransliteration('');
                    setNotes('');
                    setError('');
                  }}
                  disabled={!sourceText && !translatedText}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg lb-surface border lb-border lb-muted disabled:opacity-40 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border lb-border lb-surface overflow-hidden">
            <div className="flex-1 p-4 min-h-[176px]">
              {loading ? (
                <div className="h-full flex items-center justify-center gap-2 text-sm lb-muted">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--lb-primary)' }} />
                  <span>Translating...</span>
                </div>
              ) : translatedText ? (
                <div className="space-y-2.5">
                  <p className="text-base lb-text whitespace-pre-wrap leading-relaxed font-bengali">
                    {translatedText}
                  </p>
                  {transliteration && (
                    <p className="text-xs lb-muted italic">Pronunciation: {transliteration}</p>
                  )}
                  {notes && (
                    <p
                      className="text-xs rounded-lg px-3 py-2 border lb-border lb-surface-alt"
                      style={{ color: 'var(--lb-primary)' }}
                    >
                      {notes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm lb-muted">Translation will appear here...</p>
              )}
            </div>

            <div className="px-4 py-2.5 border-t lb-border flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!translatedText}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg lb-surface-alt border lb-border lb-text disabled:opacity-40 font-medium cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              {isSpeechSynthesisSupported() && (
                <button
                  type="button"
                  onClick={() => speakText(translatedText, resolveBcp47(targetLang))}
                  disabled={!translatedText}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg lb-surface-alt border lb-border lb-text disabled:opacity-40 font-medium cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" style={{ color: 'var(--lb-primary)' }} />
                  <span>Listen</span>
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  translatedText &&
                  toggleSaveTranslation({
                    sourceText: sourceText.trim(),
                    translatedText,
                    sourceLang: detectedLang || sourceLang,
                    targetLang,
                  })
                }
                disabled={!translatedText}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg lb-surface-alt border lb-border disabled:opacity-40 font-medium cursor-pointer"
                style={{ color: saved ? 'var(--lb-primary)' : 'var(--lb-text)' }}
              >
                <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                <span>{saved ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-[#DC2626]">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleTranslate}
            disabled={loading || !sourceText.trim()}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-sm sm:text-base lb-btn-primary disabled:opacity-50 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Translating...' : 'Translate'}</span>
          </button>
        </div>
      </div>

      {/* History & Saved */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="lb-surface border lb-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4" style={{ color: 'var(--lb-primary)' }} />
            <h3 className="text-base font-bold lb-text">Recent Translations</h3>
          </div>
          {data.translationHistory.length === 0 ? (
            <p className="text-sm lb-muted">Your recent translations appear here.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {data.translationHistory.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceText(item.sourceText);
                      setTranslatedText(item.translatedText);
                    }}
                    className="w-full text-left p-2.5 rounded-xl lb-surface-alt border lb-border cursor-pointer"
                  >
                    <div className="text-xs lb-muted">
                      {item.sourceLang} → {item.targetLang}
                    </div>
                    <div className="text-sm font-medium lb-text truncate font-bengali">
                      {item.sourceText} → {item.translatedText}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lb-surface border lb-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bookmark className="w-4 h-4" style={{ color: 'var(--lb-accent-2)' }} />
            <h3 className="text-base font-bold lb-text">Saved Translations</h3>
          </div>
          {data.savedTranslations.length === 0 ? (
            <p className="text-sm lb-muted">Bookmark translations to review anytime.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {data.savedTranslations.map((item) => (
                <li
                  key={item.id}
                  className="p-2.5 rounded-xl lb-surface-alt border lb-border flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSourceText(item.sourceText);
                      setTranslatedText(item.translatedText);
                    }}
                    className="text-left min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="text-xs font-bold truncate font-bengali" style={{ color: 'var(--lb-primary)' }}>
                      {item.sourceText}
                    </div>
                    <div className="text-sm lb-text truncate font-bengali">{item.translatedText}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSaveTranslation(item)}
                    className="text-xs text-[#DC2626] hover:underline shrink-0 cursor-pointer"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
