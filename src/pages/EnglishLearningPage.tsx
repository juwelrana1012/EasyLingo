import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  GraduationCap,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ENGLISH_LESSONS, ENGLISH_LEVELS } from '../data/englishCurriculum';
import { EnglishLesson, EnglishLevel } from '../types';
import { speakText } from '../utils/speech';

export function EnglishLearningPage() {
  const { data, toggleLessonComplete, t } = useApp();
  const [selectedLevel, setSelectedLevel] = useState<EnglishLevel>('Beginner');
  const [activeLesson, setActiveLesson] = useState<EnglishLesson | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const levelLessons = ENGLISH_LESSONS.filter((l) => l.level === selectedLevel);

  const handleSelectLesson = (lesson: EnglishLesson) => {
    setActiveLesson(lesson);
    setAnswers({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (activeLesson) {
    const isCompleted = data.completedLessons.includes(activeLesson.id);
    const correctCount = activeLesson.exercises.filter(
      (ex) => answers[ex.id] === ex.correctIndex
    ).length;

    return (
      <div className="max-w-[1040px] mx-auto space-y-6">
        <button
          type="button"
          onClick={() => setActiveLesson(null)}
          className="inline-flex items-center gap-2 text-sm font-semibold lb-primary-text hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {activeLesson.level} Lessons</span>
        </button>

        <div className="lb-surface border lb-border rounded-2xl p-6 sm:p-8 space-y-8 shadow-xs">
          {/* Lesson Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b lb-border">
            <div>
              <div className="text-xs font-semibold lb-muted mb-1.5">
                {activeLesson.level} · {activeLesson.category} · {activeLesson.durationMinutes} min
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold lb-text">
                {activeLesson.title}
              </h1>
              <p className="text-base lb-primary-text font-bengali font-medium mt-1">
                {activeLesson.titleBn}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleLessonComplete(activeLesson.id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                isCompleted ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'lb-btn-primary'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCompleted ? 'Completed' : 'Mark as Complete'}</span>
            </button>
          </div>

          {/* Explanations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="lb-surface-alt rounded-xl p-5 border lb-border">
              <h2 className="text-base font-bold lb-text mb-3">Key Explanation (English)</h2>
              <ul className="space-y-2.5 text-sm lb-text leading-relaxed list-disc pl-4">
                {activeLesson.explanationEn.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="lb-surface-alt rounded-xl p-5 border lb-border">
              <h2 className="text-base font-bold lb-text font-bengali mb-3">সহজ বাংলা ব্যাখ্যা</h2>
              <ul className="space-y-2.5 text-sm lb-text font-bengali leading-relaxed list-disc pl-4">
                {activeLesson.explanationBn.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Examples */}
          <div>
            <h2 className="text-lg font-bold lb-text mb-3">
              Examples &amp; Pronunciation (উদাহরণসমূহ)
            </h2>
            <div className="space-y-3">
              {activeLesson.examples.map((ex, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border lb-border lb-surface-alt"
                >
                  <div>
                    <p className="text-base font-semibold lb-text">{ex.en}</p>
                    <p className="text-sm lb-primary-text font-bengali mt-0.5">{ex.bn}</p>
                    {ex.note && <p className="text-xs lb-muted mt-1">Note: {ex.note}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => speakText(ex.en, 'English')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg lb-surface border lb-border text-xs font-semibold lb-text self-start sm:self-center shrink-0 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 lb-primary-text" />
                    <span>Listen</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Practice inside this lesson */}
          <div className="pt-4 border-t lb-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold lb-text">
                Lesson Check ({activeLesson.exercises.length} Questions)
              </h2>
              <span className="text-sm font-semibold lb-primary-text tabular-nums">
                Score: {correctCount}/{activeLesson.exercises.length}
              </span>
            </div>

            <div className="space-y-4">
              {activeLesson.exercises.map((ex, idx) => {
                const chosen = answers[ex.id];
                const answered = chosen !== undefined;
                const isCorrect = chosen === ex.correctIndex;

                return (
                  <div
                    key={ex.id}
                    className="p-5 rounded-xl lb-surface-alt border lb-border"
                  >
                    <p className="text-sm sm:text-base font-bold lb-text mb-3">
                      {idx + 1}. {ex.question}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {ex.options.map((opt, optIdx) => {
                        let btnStyle = 'lb-surface lb-border lb-text';
                        if (answered) {
                          if (optIdx === ex.correctIndex) {
                            btnStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold';
                          } else if (optIdx === chosen) {
                            btnStyle = 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-400';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [ex.id]: optIdx }))}
                            className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer ${btnStyle}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {answered && (
                      <div
                        className={`mt-3 p-3 rounded-lg text-xs sm:text-sm flex items-start gap-2 ${
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
                        <div>
                          <p className="font-semibold">
                            {isCorrect ? 'Correct!' : 'Not quite right.'} {ex.explanationEn}
                          </p>
                          <p className="font-bengali mt-0.5 opacity-90">{ex.explanationBn}</p>
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
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold lb-text tracking-tight">
          {t('topicEnglish')}
        </h1>
        <p className="text-sm lb-muted mt-1">
          Step-by-step English lessons from Beginner to Advanced with Bengali meanings, audio examples, and exercises.
        </p>
      </div>

      {/* 5 Level Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ENGLISH_LEVELS.map((lvl) => {
          const isActive = selectedLevel === lvl.level;
          const count = ENGLISH_LESSONS.filter((l) => l.level === lvl.level).length;
          const doneCount = ENGLISH_LESSONS.filter(
            (l) => l.level === lvl.level && data.completedLessons.includes(l.id)
          ).length;

          return (
            <button
              key={lvl.level}
              type="button"
              onClick={() => setSelectedLevel(lvl.level)}
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'lb-surface shadow-sm ring-2 ring-[var(--lb-primary)] border-[var(--lb-primary)]'
                  : 'lb-surface-alt lb-border hover:opacity-90'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-bold ${isActive ? 'lb-primary-text' : 'lb-text'}`}>
                  {lvl.level}
                </span>
                <span className="text-xs font-semibold lb-muted tabular-nums">
                  {doneCount}/{count}
                </span>
              </div>
              <p className="text-xs lb-muted mt-1">{lvl.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {levelLessons.map((lesson) => {
          const completed = data.completedLessons.includes(lesson.id);
          return (
            <div
              key={lesson.id}
              className="lb-surface border lb-border rounded-2xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--lb-primary) 14%, transparent)',
                      color: 'var(--lb-primary)',
                    }}
                  >
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-medium lb-muted flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{lesson.durationMinutes} min</span>
                    <span>·</span>
                    <span>{lesson.exercises.length} practice</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold lb-text">{lesson.title}</h3>
                <p className="text-sm font-semibold lb-primary-text font-bengali mt-0.5">
                  {lesson.titleBn}
                </p>
                <p className="text-sm lb-muted mt-2 leading-relaxed">{lesson.summary}</p>
                <p className="text-xs lb-muted font-bengali mt-1">{lesson.summaryBn}</p>
              </div>

              <div className="mt-5 pt-4 border-t lb-border flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectLesson(lesson)}
                  className="flex-1 py-2.5 px-4 rounded-xl lb-btn-primary text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                >
                  {completed ? 'Review Lesson' : 'Open Lesson →'}
                </button>
                {completed && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" />
                    Done
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
