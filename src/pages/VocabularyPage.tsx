import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCw,
  Volume2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VOCABULARY_DECK } from '../data/dictionaryAndVocab';
import { downloadVocabularyPdf } from '../utils/pdfExport';
import { speakText } from '../utils/speech';

export function VocabularyPage() {
  const {
    data,
    toggleWordLearned,
    toggleSaveWord,
    isWordSaved,
    t,
  } = useApp();

  const [mode, setMode] = useState<'flashcards' | 'list' | 'saved'>('flashcards');
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [exporting, setExporting] = useState(false);

  const filteredWords = useMemo(() => {
    if (mode === 'saved') {
      return VOCABULARY_DECK.filter(
        (w) => isWordSaved(w.word) || !data.learnedWords.includes(w.id)
      );
    }
    if (levelFilter === 'All') return VOCABULARY_DECK;
    return VOCABULARY_DECK.filter((w) => w.level === levelFilter);
  }, [levelFilter, mode, data.learnedWords, isWordSaved]);

  const activeCard =
    filteredWords[cardIndex % Math.max(filteredWords.length, 1)] || VOCABULARY_DECK[0];
  const learnedCount = data.learnedWords.length;
  const totalCount = VOCABULARY_DECK.length;
  const goalPct = Math.min(100, Math.round((learnedCount / Math.max(totalCount, 1)) * 100));

  const nextCard = () => {
    setFlipped(false);
    setCardIndex((i) => (i + 1) % Math.max(filteredWords.length, 1));
  };

  const prevCard = () => {
    setFlipped(false);
    setCardIndex((i) => (i - 1 + Math.max(filteredWords.length, 1)) % Math.max(filteredWords.length, 1));
  };

  const handleExportDeckPdf = () => {
    setExporting(true);
    try {
      downloadVocabularyPdf({
        topic: `Vocabulary Deck (${levelFilter})`,
        languageLabel: 'Bengali',
        items: filteredWords.map((w) => ({
          word: w.word,
          phonetic: w.phonetic,
          partOfSpeech: w.partOfSpeech,
          meaning: w.banglaMeaning,
          exampleEn: w.examples[0]?.en || '',
          exampleTranslated: w.examples[0]?.bn || '',
        })),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold lb-text tracking-tight">
            {t('topicVocab')}
          </h1>
          <p className="text-sm lb-muted mt-1">
            Interactive vocabulary flashcards with Bengali meanings, audio pronunciation, and printable PDF deck export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl lb-surface-alt border lb-border">
            {[
              { id: 'flashcards' as const, label: 'Flashcards' },
              { id: 'list' as const, label: 'All Words' },
              { id: 'saved' as const, label: 'Revision Queue' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setCardIndex(0);
                  setFlipped(false);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  mode === tab.id ? 'lb-btn-primary' : 'lb-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportDeckPdf}
            disabled={exporting || filteredWords.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl lb-btn-outline text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Creating PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Mastery Progress Bar */}
      <div className="lb-surface border lb-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold lb-text">Deck Mastery</h2>
          <p className="text-xs lb-muted">
            Mark flashcards as learned to track how many words you have mastered in this deck.
          </p>
        </div>
        <div className="flex items-center gap-4 min-w-[220px]">
          <div className="flex-1 h-2.5 rounded-full lb-surface-alt overflow-hidden border lb-border">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${goalPct}%`, backgroundColor: 'var(--lb-primary)' }}
            />
          </div>
          <span className="text-sm font-bold lb-primary-text tabular-nums whitespace-nowrap">
            {learnedCount} / {totalCount}
          </span>
        </div>
      </div>

      {/* Flashcards Mode */}
      {mode === 'flashcards' && activeCard && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between text-xs font-semibold lb-muted">
            <span>
              Card {(cardIndex % filteredWords.length) + 1} of {filteredWords.length} · {activeCard.level}
            </span>
            <span>Click card to flip</span>
          </div>

          <div
            onClick={() => setFlipped((f) => !f)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setFlipped((f) => !f);
              }
            }}
            className="cursor-pointer select-none rounded-2xl lb-surface border lb-border shadow-sm p-8 sm:p-10 min-h-[280px] flex flex-col justify-between transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold lb-primary-text">
                {activeCard.category} · {activeCard.partOfSpeech}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakText(activeCard.word, 'English');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg lb-surface-alt border lb-border text-xs font-semibold lb-text cursor-pointer"
              >
                <Volume2 className="w-4 h-4 lb-primary-text" />
                <span>Pronounce</span>
              </button>
            </div>

            {!flipped ? (
              <div className="text-center py-8 space-y-2">
                <h3 className="text-4xl sm:text-5xl font-extrabold lb-text">{activeCard.word}</h3>
                <p className="text-base font-mono-tabular lb-muted">{activeCard.phonetic}</p>
              </div>
            ) : (
              <div className="py-4 space-y-3">
                <div>
                  <span className="text-xs font-bold lb-primary-text">বাংলা অর্থ:</span>
                  <p className="text-2xl font-bold lb-text font-bengali">
                    {activeCard.banglaMeaning}
                  </p>
                </div>
                <p className="text-sm lb-muted">{activeCard.englishDefinition}</p>
                {activeCard.examples[0] && (
                  <div className="p-3 rounded-xl lb-surface-alt border lb-border text-sm">
                    <p className="font-semibold lb-text">&ldquo;{activeCard.examples[0].en}&rdquo;</p>
                    <p className="text-xs lb-muted font-bengali mt-0.5">
                      {activeCard.examples[0].bn}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs lb-muted">
              <RotateCw className="w-3.5 h-3.5" />
              <span>{flipped ? 'Show Word' : 'Reveal Bengali Meaning & Example'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={prevCard}
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl border lb-border lb-surface text-sm font-semibold lb-text cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={nextCard}
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl border lb-border lb-surface text-sm font-semibold lb-text cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  toggleSaveWord({
                    word: activeCard.word,
                    phonetic: activeCard.phonetic,
                    partOfSpeech: activeCard.partOfSpeech,
                    banglaMeaning: activeCard.banglaMeaning,
                    englishDefinition: activeCard.englishDefinition,
                    exampleEn: activeCard.examples[0]?.en || '',
                    exampleBn: activeCard.examples[0]?.bn || '',
                  })
                }
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer ${
                  isWordSaved(activeCard.word) ? 'lb-btn-outline' : 'lb-surface lb-border lb-text'
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 ${isWordSaved(activeCard.word) ? 'fill-current' : ''}`}
                />
                <span>{isWordSaved(activeCard.word) ? 'Saved' : 'Save'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleWordLearned(activeCard.id);
                  if (!data.learnedWords.includes(activeCard.id)) {
                    nextCard();
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap ${
                  data.learnedWords.includes(activeCard.id)
                    ? 'bg-emerald-600 text-white'
                    : 'lb-btn-primary'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {data.learnedWords.includes(activeCard.id) ? 'Learned' : 'Mark as Learned'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List / Revision Mode */}
      {mode !== 'flashcards' && (
        <div className="space-y-4">
          {mode === 'list' && (
            <div className="flex flex-wrap gap-2">
              {['All', 'Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced'].map(
                (lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevelFilter(lvl)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                      levelFilter === lvl
                        ? 'lb-btn-primary border-transparent'
                        : 'lb-surface lb-border lb-muted'
                    }`}
                  >
                    {lvl}
                  </button>
                )
              )}
            </div>
          )}

          {filteredWords.length === 0 ? (
            <div className="p-8 text-center rounded-2xl lb-surface border lb-border text-sm lb-muted">
              All words in this queue have been learned! Great job.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWords.map((word) => {
                const learned = data.learnedWords.includes(word.id);
                const saved = isWordSaved(word.word);
                return (
                  <div
                    key={word.id}
                    className="lb-surface border lb-border rounded-2xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold lb-text">{word.word}</h3>
                            <button
                              type="button"
                              onClick={() => speakText(word.word, 'English')}
                              className="p-1 rounded-lg lb-surface-alt lb-primary-text cursor-pointer"
                              aria-label={`Listen to ${word.word}`}
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs font-mono-tabular lb-muted">
                            {word.phonetic} · {word.partOfSpeech} · {word.level}
                          </p>
                        </div>
                      </div>

                      <p className="text-base font-bold lb-primary-text font-bengali">
                        {word.banglaMeaning}
                      </p>
                      <p className="text-sm lb-muted">{word.englishDefinition}</p>
                      {word.examples[0] && (
                        <div className="p-3 rounded-xl lb-surface-alt border lb-border text-xs space-y-0.5">
                          <p className="font-semibold lb-text">{word.examples[0].en}</p>
                          <p className="lb-muted font-bengali">{word.examples[0].bn}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t lb-border">
                      <button
                        type="button"
                        onClick={() =>
                          toggleSaveWord({
                            word: word.word,
                            phonetic: word.phonetic,
                            partOfSpeech: word.partOfSpeech,
                            banglaMeaning: word.banglaMeaning,
                            englishDefinition: word.englishDefinition,
                            exampleEn: word.examples[0]?.en || '',
                            exampleBn: word.examples[0]?.bn || '',
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                          saved ? 'lb-btn-outline' : 'lb-surface lb-border lb-muted'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                        <span>{saved ? 'Saved' : 'Save Word'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleWordLearned(word.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          learned ? 'bg-emerald-600 text-white' : 'lb-btn-primary'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{learned ? 'Learned' : 'Mark Learned'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
