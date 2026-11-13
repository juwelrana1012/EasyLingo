import React from 'react';
import {
  BookA,
  CheckCircle2,
  FileSearch,
  GraduationCap,
  Languages,
  Layers,
  Mic,
  Sparkles,
} from 'lucide-react';
import { useApp, WorkspaceTopicId } from '../context/AppContext';
import { BanglaLearningPage } from './BanglaLearningPage';
import { EnglishLearningPage } from './EnglishLearningPage';
import { GrammarCheckerPage } from './GrammarCheckerPage';
import { SentenceBuilderPage } from './SentenceBuilderPage';
import { SpeakingPracticePage } from './SpeakingPracticePage';
import { TranslatorPage } from './TranslatorPage';
import { VocabularyPage } from './VocabularyPage';
import { WordMeaningPage } from './WordMeaningPage';

interface TopicNavItem {
  id: WorkspaceTopicId;
  labelKey:
    | 'topicWordMeaning'
    | 'topicTranslator'
    | 'topicSpeaking'
    | 'topicSentences'
    | 'topicGrammar'
    | 'topicEnglish'
    | 'topicBangla'
    | 'topicVocab';
  icon: React.ComponentType<{ className?: string }>;
  accentVar: string;
}

const PRIMARY_TOOLS_ROW: TopicNavItem[] = [
  { id: 'word-meaning', labelKey: 'topicWordMeaning', icon: FileSearch, accentVar: 'var(--lb-primary)' },
  { id: 'translator', labelKey: 'topicTranslator', icon: Languages, accentVar: 'var(--lb-accent-5)' },
  { id: 'speaking', labelKey: 'topicSpeaking', icon: Mic, accentVar: 'var(--lb-accent-2)' },
  { id: 'sentences', labelKey: 'topicSentences', icon: Sparkles, accentVar: 'var(--lb-accent-3)' },
  { id: 'grammar', labelKey: 'topicGrammar', icon: CheckCircle2, accentVar: 'var(--lb-accent-4)' },
];

const CURRICULUM_ROW: TopicNavItem[] = [
  { id: 'english', labelKey: 'topicEnglish', icon: GraduationCap, accentVar: 'var(--lb-primary)' },
  { id: 'bangla', labelKey: 'topicBangla', icon: BookA, accentVar: 'var(--lb-accent-2)' },
  { id: 'vocabulary', labelKey: 'topicVocab', icon: Layers, accentVar: 'var(--lb-accent-3)' },
];

export function WorkspacePage() {
  const { activeTopic, setActiveTopic, t } = useApp();

  const renderTopicButton = (item: TopicNavItem) => {
    const Icon = item.icon;
    const isActive = activeTopic === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setActiveTopic(item.id)}
        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
          isActive
            ? 'lb-btn-primary border-transparent shadow-sm'
            : 'lb-surface lb-border lb-text hover:opacity-90'
        }`}
      >
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={
            isActive
              ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'var(--lb-primary-text)' }
              : {
                  backgroundColor: `color-mix(in srgb, ${item.accentVar} 14%, transparent)`,
                  color: item.accentVar,
                }
          }
        >
          <Icon className="w-4 h-4" />
        </span>
        <span className="text-xs sm:text-sm font-bold leading-tight truncate">
          {t(item.labelKey)}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full">
      {/* Stationary Multi-Row Pinned Top Topic Grid */}
      <div className="lb-surface-alt border-b lb-border">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-4 space-y-2.5">
          {/* Row 1: 5 Independent Core Tools */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {PRIMARY_TOOLS_ROW.map(renderTopicButton)}
          </div>

          {/* Row 2: 3 Structured Learning & Flashcard Modules */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {CURRICULUM_ROW.map(renderTopicButton)}
          </div>
        </div>
      </div>

      {/* Full-Screen Isolated Feature Canvas */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8">
        {activeTopic === 'word-meaning' && <WordMeaningPage />}
        {activeTopic === 'translator' && <TranslatorPage />}
        {activeTopic === 'speaking' && <SpeakingPracticePage />}
        {activeTopic === 'sentences' && <SentenceBuilderPage />}
        {activeTopic === 'grammar' && <GrammarCheckerPage />}
        {activeTopic === 'english' && <EnglishLearningPage />}
        {activeTopic === 'bangla' && <BanglaLearningPage />}
        {activeTopic === 'vocabulary' && <VocabularyPage />}
      </div>
    </div>
  );
}
