import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BANGLA_TOPICS } from '../data/banglaCurriculum';
import { BanglaTopic } from '../types';
import { postJson } from '../utils/apiClient';
import { speakText } from '../utils/speech';

export function BanglaLearningPage() {
  const { data, toggleLessonComplete, t } = useApp();
  const [activeTopic, setActiveTopic] = useState<BanglaTopic | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Interactive Bengali sentence & spelling checker inside Bangla Learning
  const [bnInput, setBnInput] = useState('');
  const [bnLoading, setBnLoading] = useState(false);
  const [bnError, setBnError] = useState('');
  const [bnResult, setBnResult] = useState<{
    hasErrors: boolean;
    correctedText: string;
    overallFeedbackBn: string;
    issues: Array<{ original: string; correction: string; explanationBn: string }>;
  } | null>(null);

  const handleCheckBangla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bnInput.trim()) return;
    setBnLoading(true);
    setBnError('');
    setBnResult(null);
    try {
      const json = await postJson<{
        hasErrors: boolean;
        correctedText: string;
        overallFeedbackBn: string;
        issues: Array<{ original: string; correction: string; explanationBn: string }>;
      }>(
        '/api/grammar/check',
        { text: bnInput.trim(), language: 'bn' },
        { fallbackError: 'বাংলা যাচাই করতে সমস্যা হয়েছে।' }
      );
      setBnResult(json);
    } catch (err) {
      setBnError(err instanceof Error ? err.message : 'বাংলা যাচাই করতে ব্যর্থ হয়েছে।');
    } finally {
      setBnLoading(false);
    }
  };

  if (activeTopic) {
    const isCompleted = data.completedLessons.includes(activeTopic.id);

    return (
      <div className="max-w-[1040px] mx-auto space-y-6">
        <button
          type="button"
          onClick={() => setActiveTopic(null)}
          className="inline-flex items-center gap-2 text-sm font-semibold lb-primary-text hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>সকল বাংলা বিষয়ে ফিরে যান (All Topics)</span>
        </button>

        <div className="lb-surface border lb-border rounded-2xl p-6 sm:p-8 space-y-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b lb-border">
            <div>
              <div className="text-xs font-semibold lb-muted mb-1">
                বাংলা শিক্ষা · {activeTopic.titleEn}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold lb-text font-bengali">
                {activeTopic.titleBn}
              </h1>
              <p className="text-sm sm:text-base lb-muted font-bengali mt-1">
                {activeTopic.subtitleBn}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleLessonComplete(activeTopic.id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                isCompleted ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'lb-btn-primary'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-bengali">{isCompleted ? 'সম্পন্ন হয়েছে' : 'পাঠ সম্পন্ন করুন'}</span>
            </button>
          </div>

          {/* Core Explanation & Rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="lb-surface-alt rounded-xl p-5 border lb-border">
              <h2 className="text-base font-bold lb-text font-bengali mb-3">
                মূল ধারণা ও ব্যাখ্যা
              </h2>
              <div className="space-y-2.5 text-sm lb-text font-bengali leading-relaxed">
                {activeTopic.explanationBn.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>

            <div className="lb-surface-alt rounded-xl p-5 border lb-border">
              <h2 className="text-base font-bold lb-text font-bengali mb-3">
                প্রয়োজনীয় নিয়মাবলি
              </h2>
              <ul className="space-y-2 text-sm lb-text font-bengali leading-relaxed list-disc pl-4">
                {activeTopic.rulesBn.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Incorrect vs Correct Comparison */}
          <div>
            <h2 className="text-lg font-bold lb-text font-bengali mb-3">
              ভুল ও সঠিক ব্যবহারের তুলনা
            </h2>
            <div className="space-y-3">
              {activeTopic.comparisons.map((cmp, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border lb-border lb-surface-alt"
                >
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <span className="text-xs font-bold text-red-500 font-bengali">অশুদ্ধ (ভুল):</span>
                    <p className="text-sm font-medium lb-text font-bengali mt-1">
                      {cmp.incorrect}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-bengali">
                      শুদ্ধ (সঠিক):
                    </span>
                    <p className="text-sm font-semibold lb-text font-bengali mt-1">
                      {cmp.correct}
                    </p>
                    <p className="text-xs lb-muted font-bengali mt-1">{cmp.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Examples with Speech */}
          <div>
            <h2 className="text-lg font-bold lb-text font-bengali mb-3">
              উদাহরণ ও উচ্চারণ
            </h2>
            <div className="space-y-2.5">
              {activeTopic.examplesBn.map((ex, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border lb-border lb-surface-alt"
                >
                  <div>
                    <p className="text-base font-semibold lb-text font-bengali">{ex.text}</p>
                    <p className="text-xs lb-muted mt-0.5">{ex.meaning}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakText(ex.text, 'Bengali')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg lb-surface border lb-border text-xs font-semibold lb-text self-start sm:self-center shrink-0 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 lb-primary-text" />
                    <span className="font-bengali">শুনুন</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Practice Exercise */}
          <div className="pt-4 border-t lb-border">
            <h2 className="text-lg font-bold lb-text font-bengali mb-4">অনুশীলন প্রশ্ন</h2>
            <div className="space-y-4">
              {activeTopic.exercises.map((ex, idx) => {
                const chosen = answers[ex.id];
                const answered = chosen !== undefined;
                const isCorrect = chosen === ex.correctIndex;

                return (
                  <div
                    key={ex.id}
                    className="p-5 rounded-xl lb-surface-alt border lb-border"
                  >
                    <p className="text-base font-bold lb-text font-bengali mb-3">
                      {idx + 1}. {ex.question}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {ex.options.map((opt, optIdx) => {
                        let cls = 'lb-surface lb-border lb-text';
                        if (answered) {
                          if (optIdx === ex.correctIndex) {
                            cls = 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold';
                          } else if (optIdx === chosen) {
                            cls = 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-400';
                          }
                        }
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [ex.id]: optIdx }))}
                            className={`text-left px-4 py-2.5 rounded-lg border text-sm font-bengali transition-colors cursor-pointer ${cls}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {answered && (
                      <div
                        className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${
                          isCorrect
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-500/15 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <div className="font-bengali">
                          <p className="font-semibold">{ex.explanationBn}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold lb-text tracking-tight">
          {t('topicBangla')} — শুদ্ধ বাংলা শিক্ষা
        </h1>
        <p className="text-sm lb-muted font-bengali mt-1">
          শুদ্ধ বাংলা বলা, লেখা, বাংলা ব্যাকরণ, বানান সংশোধন, সমার্থক ও বিপরীত শব্দ শিখুন।
        </p>
      </div>

      {/* All 10 Bangla Topics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {BANGLA_TOPICS.map((topic, index) => {
          const done = data.completedLessons.includes(topic.id);
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => {
                setActiveTopic(topic);
                setAnswers({});
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group text-left lb-surface border lb-border rounded-2xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm tabular-nums"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--lb-primary) 14%, transparent)',
                      color: 'var(--lb-primary)',
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  {done ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                      সম্পন্ন
                    </span>
                  ) : (
                    <BookOpen className="w-4 h-4 lb-muted group-hover:lb-primary-text" />
                  )}
                </div>

                <h2 className="text-xl font-bold lb-text font-bengali transition-colors">
                  {topic.titleBn}
                </h2>
                <p className="text-xs font-medium lb-muted mt-0.5">{topic.titleEn}</p>
                <p className="text-sm lb-muted font-bengali mt-2 leading-relaxed">
                  {topic.subtitleBn}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t lb-border text-sm font-semibold lb-primary-text font-bengali">
                পাঠ শুরু করুন →
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Bangla Spelling & Sentence Helper */}
      <div className="lb-surface border lb-border rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-2">
          <Sparkles className="w-5 h-5 lb-primary-text" />
          <h2 className="text-xl font-bold lb-text font-bengali">
            বাংলা বানান ও বাক্য যাচাই করুন
          </h2>
        </div>
        <p className="text-sm lb-muted font-bengali mb-4">
          যেকোনো বাংলা বাক্য লিখে তার বানান, বিরামচিহ্ন ও ব্যাকরণগত শুদ্ধতা যাচাই করুন।
        </p>

        <form onSubmit={handleCheckBangla} className="space-y-3">
          <textarea
            value={bnInput}
            onChange={(e) => setBnInput(e.target.value)}
            rows={3}
            placeholder="উদাহরণ: তাহারা আজকে সরকারী স্কুলে যাচ্ছে."
            className="w-full rounded-xl lb-surface-alt border lb-border p-4 text-sm sm:text-base font-bengali lb-text focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={bnLoading || !bnInput.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl lb-btn-primary text-sm font-semibold disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {bnLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span className="font-bengali">{bnLoading ? 'যাচাই হচ্ছে...' : 'বাংলা যাচাই করুন'}</span>
            </button>
            <button
              type="button"
              onClick={() => setBnInput('তাহারা আজকে সরকারী স্কুলে যাচ্ছে এবং শ্রদ্ধাঞ্জলী দিবে.')}
              className="px-3.5 py-2 rounded-xl lb-surface-alt border lb-border text-xs font-semibold lb-muted font-bengali cursor-pointer"
            >
              উদাহরণ লোড করুন
            </button>
          </div>
        </form>

        {bnError && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-500">
            {bnError}
          </div>
        )}

        {bnResult && (
          <div className="mt-5 p-5 rounded-xl lb-surface-alt border lb-border space-y-3">
            <div className="flex items-center gap-2">
              {bnResult.hasErrors ? (
                <span className="text-sm font-bold lb-primary-text font-bengali">
                  সংশোধিত বাংলা বাক্য:
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-500 font-bengali">
                  <CheckCircle2 className="w-4 h-4" />
                  বাক্যটি সম্পূর্ণ শুদ্ধ!
                </span>
              )}
            </div>
            <p className="text-base font-semibold lb-text font-bengali">
              {bnResult.correctedText}
            </p>
            <p className="text-sm lb-muted font-bengali">{bnResult.overallFeedbackBn}</p>
            {bnResult.issues?.length > 0 && (
              <ul className="space-y-2 pt-2 border-t lb-border">
                {bnResult.issues.map((iss, idx) => (
                  <li key={idx} className="text-sm font-bengali lb-text">
                    <span className="line-through text-red-500 mr-2">{iss.original}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 mr-2">
                      → {iss.correction}
                    </span>
                    <span className="lb-muted">({iss.explanationBn})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
