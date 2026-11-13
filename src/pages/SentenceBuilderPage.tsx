import React, { useRef, useState } from 'react';
import { Loader2, PenTool, Sparkles, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { postJson } from '../utils/apiClient';
import { getFastCache, setFastCache } from '../utils/fastCache';
import { speakText } from '../utils/speech';

interface GeneratedSentence {
  label: string;
  english: string;
  translation: string;
  grammarTip: string;
}

interface SentenceResponse {
  structureFormula: string;
  structureNote: string;
  sentences: GeneratedSentence[];
}

export function SentenceBuilderPage() {
  const { selectedCountry } = useApp();
  const [input, setInput] = useState('');
  const [focus, setFocus] = useState('All Tenses & Contexts');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SentenceResponse | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const meaningLang = selectedCountry.language.startsWith('English')
    ? 'Bengali'
    : selectedCountry.language;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = input.trim();
    if (!clean) {
      setError('Please enter a word, phrase, or topic to build sentences.');
      return;
    }

    const cacheKey = `${meaningLang}:${focus}:${clean.toLowerCase()}`;
    const cached = getFastCache<SentenceResponse>('sent', cacheKey);
    if (cached) {
      setError('');
      setResult(cached);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const json = await postJson<SentenceResponse>(
        '/api/sentences/generate',
        {
          input: clean,
          meaningLanguage: meaningLang,
          focus,
        },
        { signal: controller.signal, fallbackError: 'Could not generate sentences.' }
      );
      setFastCache('sent', cacheKey, json);
      setResult(json);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Sentence generation failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold lb-text">Sentence Builder & Practice</h2>
        <p className="text-sm lb-muted font-bengali mt-0.5">
          যেকোনো শব্দ বা বিষয় লিখে বিভিন্ন Tense ও পরিস্থিতিতে কীভাবে শুদ্ধ বাক্য তৈরি করতে হয় তা শিখুন।
        </p>
      </div>

      <form
        onSubmit={handleGenerate}
        className="lb-surface border lb-border rounded-2xl p-6 space-y-4 shadow-xs"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7">
            <label className="block text-xs font-bold lb-muted mb-1.5">
              Enter a Word, Verb, Phrase, or Topic
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. appreciate, looking forward to, coffee shop, আত্মবিশ্বাস..."
              className="w-full px-4 py-3 rounded-xl lb-surface-alt border lb-border lb-text text-sm sm:text-base focus:outline-none font-bengali"
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-bold lb-muted mb-1.5">Sentence Style Focus</label>
            <select
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="w-full px-4 py-3 rounded-xl lb-surface-alt border lb-border lb-text text-sm font-semibold focus:outline-none"
            >
              <option value="All Tenses & Contexts">All Tenses & Contexts</option>
              <option value="Daily Conversation">Daily Conversation</option>
              <option value="Questions & Polite Requests">Questions & Polite Requests</option>
              <option value="Business & Professional Email">Business & Professional Email</option>
              <option value="Negative & Conditional Forms">Negative & Conditional Forms</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {['persevere', 'could you please', 'I used to', 'in order to'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setInput(sample)}
                className="px-3 py-1 rounded-lg lb-surface-alt border lb-border text-xs font-medium lb-muted cursor-pointer"
              >
                Try: {sample}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm lb-btn-primary disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
            <span>{loading ? 'Building Sentences...' : 'Build Sentences'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-[#DC2626]">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="lb-surface border lb-border rounded-2xl p-5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--lb-primary)' }}>
              <Sparkles className="w-4 h-4" />
              <span>Sentence Structure Formula</span>
            </div>
            <p className="text-base font-extrabold lb-text font-mono-tabular">
              {result.structureFormula}
            </p>
            <p className="text-sm lb-muted font-bengali">{result.structureNote}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.sentences.map((s, idx) => (
              <div
                key={idx}
                className="lb-surface border lb-border rounded-2xl p-5 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold" style={{ color: 'var(--lb-primary)' }}>
                      {s.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakText(s.english, 'English')}
                      className="p-1.5 rounded-lg lb-surface-alt border lb-border cursor-pointer"
                      style={{ color: 'var(--lb-primary)' }}
                      aria-label="Listen to sentence"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-base font-bold lb-text leading-snug">{s.english}</p>
                  <p className="text-sm font-medium lb-muted font-bengali">{s.translation}</p>
                </div>
                <p className="text-xs lb-muted pt-2 border-t lb-border">{s.grammarTip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
