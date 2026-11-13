import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { postJson } from '../utils/apiClient';
import { getFastCache, setFastCache } from '../utils/fastCache';

interface GrammarIssue {
  original: string;
  correction: string;
  type: string;
  explanation: string;
  explanationBn: string;
}

interface GrammarAnalysis {
  hasErrors: boolean;
  correctedText: string;
  overallFeedback: string;
  overallFeedbackBn: string;
  issues: GrammarIssue[];
}

export function GrammarCheckerPage() {
  const { t } = useApp();
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<GrammarAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean) {
      setError('Please enter text to check grammar and spelling.');
      return;
    }

    const cacheKey = `${language}:${clean}`;
    const cached = getFastCache<GrammarAnalysis>('gram', cacheKey);
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
    setResult(null);

    try {
      const data = await postJson<GrammarAnalysis>(
        '/api/grammar/check',
        { text: clean, language },
        { signal: controller.signal, fallbackError: 'Grammar check failed.' }
      );
      setFastCache('gram', cacheKey, data);
      setResult(data);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Unable to check grammar right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.correctedText) return;
    try {
      await navigator.clipboard.writeText(result.correctedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold lb-text tracking-tight">
            {t('topicGrammar')}
          </h1>
          <p className="text-sm lb-muted mt-1">
            Find English or Bengali grammar and spelling mistakes, see corrected sentences, and understand every rule clearly.
          </p>
        </div>
      </div>

      {/* Main Two-Panel Card */}
      <div className="lb-surface border lb-border rounded-2xl p-5 sm:p-6 shadow-xs">
        <form onSubmit={handleCheck} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Input */}
          <div className="flex flex-col space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl lb-surface-alt border lb-border">
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('en');
                    setResult(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    language === 'en' ? 'lb-btn-primary shadow-xs' : 'lb-muted'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('bn');
                    setResult(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-bengali transition-colors cursor-pointer whitespace-nowrap ${
                    language === 'bn' ? 'lb-btn-primary shadow-xs' : 'lb-muted'
                  }`}
                >
                  বাংলা (Bengali)
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setInputText(
                    language === 'en'
                      ? 'She go to school everyday and she do not likes reading boring book.'
                      : 'তাহারা আজকে সরকারী স্কুলে যাচ্ছে এবং শ্রদ্ধাঞ্জলী দিবে.'
                  )
                }
                className="text-xs font-semibold lb-primary-text hover:underline cursor-pointer"
              >
                Load sample sentence
              </button>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, 3000))}
              rows={8}
              placeholder={
                language === 'en'
                  ? 'Enter your English sentence or paragraph here...'
                  : 'এখানে আপনার বাংলা বাক্য বা অনুচ্ছেদ লিখুন...'
              }
              className="w-full rounded-xl lb-surface-alt border lb-border p-4 text-base lb-text focus:outline-none font-bengali"
            />

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setInputText('');
                  setResult(null);
                  setError('');
                }}
                disabled={!inputText}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold lb-muted hover:opacity-80 disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear</span>
              </button>

              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl lb-btn-primary text-sm font-semibold disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{loading ? 'Checking...' : 'Check Grammar'}</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Results */}
          <div className="rounded-xl lb-surface-alt border lb-border p-5 flex flex-col justify-between min-h-[280px]">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 lb-muted">
                <Loader2 className="w-7 h-7 animate-spin lb-primary-text" />
                <p className="text-sm font-medium">Analyzing grammar, spelling, and clarity...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-red-500 p-4">
                <AlertCircle className="w-7 h-7" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            ) : !result ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 lb-muted p-4">
                <CheckCircle2 className="w-8 h-8 opacity-40" />
                <p className="text-sm font-semibold lb-text">Result</p>
                <p className="text-xs max-w-xs">
                  Your corrected sentence and detailed explanations will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {result.hasErrors ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold lb-primary-text">
                        <Sparkles className="w-4 h-4" />
                        <span>
                          Corrected Result ({result.issues.length}{' '}
                          {result.issues.length === 1 ? 'issue' : 'issues'} fixed)
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-500">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>No mistakes found!</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg lb-surface border lb-border text-xs font-semibold lb-text cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl lb-surface border lb-border">
                  <p className="text-base font-semibold lb-text leading-relaxed font-bengali">
                    {result.correctedText}
                  </p>
                </div>

                <div className="text-xs sm:text-sm lb-muted space-y-1">
                  <p>{result.overallFeedback}</p>
                  <p className="font-bengali lb-primary-text">{result.overallFeedbackBn}</p>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Detailed Issue Breakdown */}
      {result && result.issues.length > 0 && (
        <div className="lb-surface border lb-border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold lb-text">
            Why Corrections Were Made ({result.issues.length})
          </h2>
          <div className="space-y-3">
            {result.issues.map((issue, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl lb-surface-alt border lb-border space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="line-through text-red-500 font-medium font-bengali">
                      {issue.original}
                    </span>
                    <span className="lb-muted">→</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold font-bengali">
                      {issue.correction}
                    </span>
                  </div>
                  <span className="text-xs font-semibold lb-primary-text">{issue.type}</span>
                </div>
                <p className="text-sm lb-text">{issue.explanation}</p>
                <p className="text-xs sm:text-sm lb-muted font-bengali">{issue.explanationBn}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
