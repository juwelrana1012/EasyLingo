import React, { useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  Download,
  FileText,
  Loader2,
  Search,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CURATED_DICTIONARY } from '../data/dictionaryAndVocab';
import { WORLD_COUNTRIES_195 } from '../data/worldCountries';
import { DictionaryEntry } from '../types';
import { postJson } from '../utils/apiClient';
import { getFastCache, setFastCache } from '../utils/fastCache';
import { downloadVocabularyPdf, PdfWordItem } from '../utils/pdfExport';
import { speakText } from '../utils/speech';

export function WordMeaningPage() {
  const { selectedCountry, data, toggleSaveWord, isWordSaved } = useApp();
  const [subMode, setSubMode] = useState<'single' | 'bulk'>('single');

  // Single Word Search State
  const [query, setQuery] = useState('');
  const [activeEntry, setActiveEntry] = useState<DictionaryEntry>(CURATED_DICTIONARY[0]);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState('');

  // Bulk Word Generator & PDF State
  const [bulkTopic, setBulkTopic] = useState('Daily English Conversation');
  const [bulkCount, setBulkCount] = useState<number>(100);
  const [meaningLang, setMeaningLang] = useState<string>(
    selectedCountry.language.startsWith('English') ? 'Bengali' : selectedCountry.language
  );
  const [bulkItems, setBulkItems] = useState<PdfWordItem[]>([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkError, setBulkError] = useState('');
  const [bulkFilter, setBulkFilter] = useState('');
  const stopRef = useRef(false);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return CURATED_DICTIONARY.filter(
      (item) => item.word.toLowerCase().includes(q) || item.banglaMeaning.includes(q)
    ).slice(0, 5);
  }, [query]);

  const abortRef = useRef<AbortController | null>(null);

  const lookupWord = async (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;
    setQuery(clean);
    setSingleError('');

    const targetLang = selectedCountry.language.startsWith('English')
      ? 'Bengali'
      : selectedCountry.language;

    if (targetLang === 'Bengali') {
      const localMatch = CURATED_DICTIONARY.find(
        (item) => item.word.toLowerCase() === clean.toLowerCase()
      );
      if (localMatch && localMatch.examples.length >= 2) {
        setActiveEntry(localMatch);
        return;
      }
    }

    const cacheKey = `${targetLang}:${clean.toLowerCase()}`;
    const cached = getFastCache<DictionaryEntry>('dict', cacheKey);
    if (cached) {
      setActiveEntry(cached);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSingleLoading(true);
    try {
      const json = await postJson<DictionaryEntry>(
        '/api/dictionary',
        { word: clean, meaningLanguage: targetLang },
        { signal: controller.signal, fallbackError: 'Could not look up word.' }
      );
      setFastCache('dict', cacheKey, json);
      setActiveEntry(json);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setSingleError(err instanceof Error ? err.message : 'Word lookup failed.');
      }
    } finally {
      setSingleLoading(false);
    }
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTopic = bulkTopic.trim();
    if (!cleanTopic) {
      setBulkError('Please enter a topic (e.g., Travel, Business, Medical, Daily Life).');
      return;
    }

    const totalWanted = Math.min(Math.max(Number(bulkCount) || 50, 10), 1000);
    setBulkGenerating(true);
    setBulkError('');
    setBulkItems([]);
    setBulkProgress(0);
    stopRef.current = false;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const collected: PdfWordItem[] = [];
    const seen = new Set<string>();
    const BATCH_SIZE = 50;
    const CONCURRENCY = totalWanted > 50 ? 4 : 1;
    const FACETS = [
      'core everyday nouns and verbs',
      'useful adjectives and adverbs',
      'practical expressions and actions',
      'professional and descriptive vocabulary',
    ];

    const runWorker = async (workerIdx: number) => {
      let round = 0;
      while (!stopRef.current && !controller.signal.aborted) {
        const remaining = totalWanted - collected.length;
        if (remaining <= 0) break;

        const reqCount = Math.min(BATCH_SIZE, Math.max(remaining, 10));
        const workerTopic =
          CONCURRENCY > 1 && round === 0
            ? `${cleanTopic} (${FACETS[workerIdx % FACETS.length]})`
            : cleanTopic;
        round += 1;

        const json = await postJson<{ items?: PdfWordItem[] }>(
          '/api/words/bulk',
          {
            topic: workerTopic,
            count: reqCount,
            meaningLanguage: meaningLang,
            excludeWords: Array.from(seen).slice(-120),
          },
          { signal: controller.signal, fallbackError: 'Batch generation failed.' }
        );

        const items: PdfWordItem[] = Array.isArray(json.items) ? json.items : [];
        if (items.length === 0) break;

        let addedInBatch = 0;
        for (const item of items) {
          const key = (item.word || '').trim().toLowerCase();
          if (key && !seen.has(key) && collected.length < totalWanted) {
            seen.add(key);
            collected.push(item);
            addedInBatch += 1;
          }
        }

        setBulkItems([...collected]);
        setBulkProgress(collected.length);

        if (addedInBatch === 0 || collected.length >= totalWanted) break;
      }
    };

    try {
      await Promise.all(Array.from({ length: CONCURRENCY }, (_, idx) => runWorker(idx)));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setBulkError(
          err instanceof Error
            ? `${err.message} (${collected.length} words generated so far.)`
            : 'Generation interrupted.'
        );
      }
    } finally {
      setBulkGenerating(false);
    }
  };

  const filteredBulkItems = useMemo(() => {
    const q = bulkFilter.trim().toLowerCase();
    if (!q) return bulkItems;
    return bulkItems.filter(
      (i) =>
        i.word.toLowerCase().includes(q) ||
        i.meaning.toLowerCase().includes(q) ||
        i.exampleEn.toLowerCase().includes(q)
    );
  }, [bulkItems, bulkFilter]);

  const uniqueLanguages = useMemo(() => {
    const map = new Map<string, string>();
    map.set('Bengali', 'Bengali (বাংলা)');
    map.set('English', 'English');
    for (const c of WORLD_COUNTRIES_195) {
      if (!map.has(c.language)) {
        map.set(c.language, `${c.language} (${c.nativeName})`);
      }
    }
    return Array.from(map.entries());
  }, []);

  const wordSaved = isWordSaved(activeEntry.word);

  return (
    <div className="space-y-6">
      {/* Sub-mode switcher inside Word Meaning tool */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b lb-border">
        <div>
          <h2 className="text-2xl font-extrabold lb-text">Unlimited Word Meaning & PDF</h2>
          <p className="text-sm lb-muted font-bengali mt-0.5">
            যেকোনো শব্দের অর্থ ও একাধিক বাক্য জানুন, অথবা ১০০/৫০০/১০০০ শব্দ তৈরি করে PDF ডাউনলোড করুন।
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl lb-surface-alt border lb-border self-start shrink-0">
          <button
            type="button"
            onClick={() => setSubMode('single')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
            style={
              subMode === 'single'
                ? { backgroundColor: 'var(--lb-primary)', color: 'var(--lb-primary-text)' }
                : { color: 'var(--lb-muted)' }
            }
          >
            <Search className="w-4 h-4" />
            <span>Single Word Search</span>
          </button>
          <button
            type="button"
            onClick={() => setSubMode('bulk')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
            style={
              subMode === 'bulk'
                ? { backgroundColor: 'var(--lb-primary)', color: 'var(--lb-primary-text)' }
                : { color: 'var(--lb-muted)' }
            }
          >
            <FileText className="w-4 h-4" />
            <span>Bulk Generator + PDF (100–1000)</span>
          </button>
        </div>
      </div>

      {/* MODE 1: SINGLE WORD UNLIMITED SEARCH */}
      {subMode === 'single' && (
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookupWord(query);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-5 h-5 lb-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any English or Bengali word (e.g., Resilience, স্বাধীনতা, Eloquent)..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl lb-surface border lb-border lb-text text-base focus:outline-none font-bengali"
              />
            </div>
            <button
              type="submit"
              disabled={singleLoading || !query.trim()}
              className="px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base lb-btn-primary disabled:opacity-50 cursor-pointer shrink-0"
            >
              {singleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
            </button>
          </form>

          {suggestions.length > 0 && query.trim().toLowerCase() !== activeEntry.word.toLowerCase() && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold lb-muted">Quick Suggestions:</span>
              {suggestions.map((s) => (
                <button
                  key={s.word}
                  type="button"
                  onClick={() => lookupWord(s.word)}
                  className="px-3 py-1.5 rounded-lg lb-surface-alt border lb-border lb-text text-xs font-medium cursor-pointer"
                >
                  {s.word} — <span className="font-bengali">{s.banglaMeaning.split(',')[0]}</span>
                </button>
              ))}
            </div>
          )}

          {singleError && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-[#DC2626]">
              {singleError}
            </div>
          )}

          <div className="lb-surface border lb-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            {singleLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 lb-muted">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--lb-primary)' }} />
                <p className="text-sm font-semibold">Finding meaning, examples & synonyms for &ldquo;{query}&rdquo;...</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b lb-border">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-3xl sm:text-4xl font-extrabold lb-text font-bengali">
                        {activeEntry.word}
                      </h3>
                      <button
                        type="button"
                        onClick={() => speakText(activeEntry.word)}
                        className="p-2 rounded-full lb-surface-alt border lb-border cursor-pointer"
                        style={{ color: 'var(--lb-primary)' }}
                        aria-label="Listen"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-sm lb-muted mt-1.5">
                      <span className="font-mono-tabular">{activeEntry.phonetic}</span>
                      <span>·</span>
                      <span className="font-bold" style={{ color: 'var(--lb-primary)' }}>
                        {activeEntry.partOfSpeech}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        downloadVocabularyPdf({
                          topic: activeEntry.word,
                          languageLabel: 'Bengali / Bilingual',
                          items: [
                            {
                              word: activeEntry.word,
                              phonetic: activeEntry.phonetic,
                              partOfSpeech: activeEntry.partOfSpeech,
                              meaning: activeEntry.banglaMeaning,
                              exampleEn: activeEntry.examples[0]?.en || '',
                              exampleTranslated: activeEntry.examples[0]?.bn || '',
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border lb-border lb-surface-alt lb-text text-sm font-semibold cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleSaveWord({
                          word: activeEntry.word,
                          phonetic: activeEntry.phonetic,
                          partOfSpeech: activeEntry.partOfSpeech,
                          banglaMeaning: activeEntry.banglaMeaning,
                          englishDefinition: activeEntry.englishDefinition,
                          exampleEn: activeEntry.examples[0]?.en || '',
                          exampleBn: activeEntry.examples[0]?.bn || '',
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                      style={
                        wordSaved
                          ? { backgroundColor: 'var(--lb-primary)', color: 'var(--lb-primary-text)' }
                          : {
                              backgroundColor: 'var(--lb-surface-alt)',
                              color: 'var(--lb-text)',
                              border: '1px solid var(--lb-border)',
                            }
                      }
                    >
                      <Bookmark className={`w-4 h-4 ${wordSaved ? 'fill-current' : ''}`} />
                      <span>{wordSaved ? 'Saved' : 'Save Word'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl lb-surface-alt border lb-border">
                    <span className="text-xs font-bold" style={{ color: 'var(--lb-primary)' }}>
                      Word Meaning
                    </span>
                    <p className="text-lg font-bold lb-text font-bengali mt-1">
                      {activeEntry.banglaMeaning}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl lb-surface-alt border lb-border">
                    <span className="text-xs font-bold lb-muted">English Definition</span>
                    <p className="text-sm sm:text-base lb-text mt-1 leading-relaxed">
                      {activeEntry.englishDefinition}
                    </p>
                  </div>
                </div>

                {/* Multiple Example Sentences */}
                <div>
                  <h4 className="text-sm font-bold lb-text mb-2.5">
                    Example Sentences ({activeEntry.examples.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeEntry.examples.map((ex, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl lb-surface-alt border lb-border flex items-start justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-semibold lb-text">{ex.en}</p>
                          <p className="text-xs sm:text-sm lb-muted font-bengali mt-1">{ex.bn}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakText(ex.en, 'English')}
                          className="p-1.5 rounded-lg lb-surface border lb-border shrink-0 cursor-pointer"
                          style={{ color: 'var(--lb-primary)' }}
                          aria-label="Listen"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Synonyms & Antonyms */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold lb-muted mb-2">Synonyms</h4>
                    <div className="flex flex-wrap gap-2">
                      {activeEntry.synonyms.map((syn) => (
                        <button
                          key={syn}
                          type="button"
                          onClick={() => lookupWord(syn)}
                          className="px-3 py-1 rounded-lg text-xs font-bold border lb-border lb-surface-alt cursor-pointer"
                          style={{ color: 'var(--lb-accent-2)' }}
                        >
                          {syn}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold lb-muted mb-2">Antonyms</h4>
                    <div className="flex flex-wrap gap-2">
                      {activeEntry.antonyms.map((ant) => (
                        <button
                          key={ant}
                          type="button"
                          onClick={() => lookupWord(ant)}
                          className="px-3 py-1 rounded-lg text-xs font-bold border lb-border lb-surface-alt cursor-pointer"
                          style={{ color: 'var(--lb-accent-4)' }}
                        >
                          {ant}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {data.savedWords.length > 0 && (
                  <div className="pt-4 border-t lb-border">
                    <h4 className="text-xs font-bold lb-muted mb-2">
                      Your Saved Words ({data.savedWords.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {data.savedWords.slice(0, 12).map((sw) => (
                        <button
                          key={sw.word}
                          type="button"
                          onClick={() => lookupWord(sw.word)}
                          className="px-3 py-1.5 rounded-lg lb-surface-alt border lb-border text-xs font-semibold lb-text cursor-pointer font-bengali"
                        >
                          {sw.word}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: BULK TOPIC WORD GENERATOR (100 / 500 / 1000 WORDS) + REAL PDF DOWNLOAD */}
      {subMode === 'bulk' && (
        <div className="space-y-6">
          <form
            onSubmit={handleBulkGenerate}
            className="lb-surface border lb-border rounded-2xl p-6 space-y-5 shadow-xs"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label className="block text-xs font-bold lb-muted mb-1.5">
                  Topic / Subject (যেকোনো বিষয় লিখুন)
                </label>
                <input
                  type="text"
                  required
                  value={bulkTopic}
                  onChange={(e) => setBulkTopic(e.target.value)}
                  placeholder="e.g. Medical & Hospital, Business, Travel, IT, School..."
                  className="w-full px-4 py-2.5 rounded-xl lb-surface-alt border lb-border lb-text text-sm focus:outline-none font-bengali"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold lb-muted mb-1.5">
                  Word Count (১০ – ১০০০)
                </label>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl lb-surface-alt border lb-border lb-text text-sm font-mono-tabular focus:outline-none"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold lb-muted mb-1.5">
                  Meaning & Translation Language
                </label>
                <select
                  value={meaningLang}
                  onChange={(e) => setMeaningLang(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl lb-surface-alt border lb-border lb-text text-sm focus:outline-none"
                >
                  {uniqueLanguages.map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Count Presets */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold lb-muted">Quick Count:</span>
                {[50, 100, 250, 500, 1000].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setBulkCount(num)}
                    className="px-3 py-1 rounded-lg border text-xs font-bold tabular-nums cursor-pointer"
                    style={
                      bulkCount === num
                        ? {
                            backgroundColor: 'var(--lb-primary)',
                            color: 'var(--lb-primary-text)',
                            borderColor: 'var(--lb-primary)',
                          }
                        : {
                            backgroundColor: 'var(--lb-surface-alt)',
                            color: 'var(--lb-text)',
                            borderColor: 'var(--lb-border)',
                          }
                    }
                  >
                    {num} Words
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                {bulkGenerating && (
                  <button
                    type="button"
                    onClick={() => {
                      stopRef.current = true;
                      abortRef.current?.abort();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#DC2626] text-white text-sm font-bold cursor-pointer"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={bulkGenerating}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm lb-btn-primary disabled:opacity-50 cursor-pointer"
                >
                  {bulkGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {bulkGenerating
                      ? `Generating (${bulkProgress}/${bulkCount})...`
                      : `Generate ${bulkCount} Words`}
                  </span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {(bulkGenerating || bulkItems.length > 0) && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold lb-muted tabular-nums">
                  <span>
                    Progress: {bulkItems.length} / {bulkCount} words ready with meanings & sentences
                  </span>
                  <span>{Math.min(100, Math.round((bulkItems.length / Math.max(bulkCount, 1)) * 100))}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full lb-surface-alt overflow-hidden border lb-border">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((bulkItems.length / Math.max(bulkCount, 1)) * 100))}%`,
                      backgroundColor: 'var(--lb-primary)',
                    }}
                  />
                </div>
              </div>
            )}
          </form>

          {bulkError && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-[#DC2626]">
              {bulkError}
            </div>
          )}

          {/* Results Table + Real PDF Download */}
          {bulkItems.length > 0 && (
            <div className="lb-surface border lb-border rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" style={{ color: 'var(--lb-primary)' }} />
                  <h3 className="text-lg font-extrabold lb-text tabular-nums">
                    Generated Vocabulary ({bulkItems.length} Words)
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="search"
                    value={bulkFilter}
                    onChange={(e) => setBulkFilter(e.target.value)}
                    placeholder="Filter generated words..."
                    className="px-3.5 py-2 rounded-xl lb-surface-alt border lb-border lb-text text-xs sm:text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      downloadVocabularyPdf({
                        topic: bulkTopic,
                        languageLabel: meaningLang,
                        items: bulkItems,
                      })
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm cursor-pointer"
                    style={{ backgroundColor: 'var(--lb-accent-2)', color: '#FFFFFF' }}
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF ({bulkItems.length} Words)</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[540px] overflow-y-auto border lb-border rounded-xl">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="sticky top-0 lb-surface-alt border-b lb-border text-xs font-bold lb-muted">
                    <tr>
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">Word & Phonetic</th>
                      <th className="py-3 px-3">Meaning ({meaningLang})</th>
                      <th className="py-3 px-3">Example Sentence & Translation</th>
                      <th className="py-3 px-3 text-right">Audio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y lb-border">
                    {filteredBulkItems.map((item, idx) => (
                      <tr key={`${item.word}-${idx}`} className="hover:opacity-95">
                        <td className="py-3 px-3 text-xs font-bold lb-muted tabular-nums align-top">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="font-bold lb-text">{item.word}</div>
                          <div className="text-xs font-mono-tabular lb-muted">
                            {item.phonetic} · {item.partOfSpeech}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold lb-text font-bengali align-top">
                          {item.meaning}
                        </td>
                        <td className="py-3 px-3 align-top space-y-0.5">
                          <div className="lb-text font-medium">{item.exampleEn}</div>
                          <div className="text-xs lb-muted font-bengali">
                            {item.exampleTranslated}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right align-top">
                          <button
                            type="button"
                            onClick={() => speakText(item.word, 'English')}
                            className="p-1.5 rounded-lg lb-surface-alt border lb-border cursor-pointer"
                            style={{ color: 'var(--lb-primary)' }}
                            aria-label={`Pronounce ${item.word}`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
