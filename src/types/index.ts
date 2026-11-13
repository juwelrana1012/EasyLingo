export type PageRoute =
  | 'home'
  | 'english'
  | 'bangla'
  | 'translator'
  | 'dictionary'
  | 'speaking'
  | 'grammar'
  | 'vocabulary'
  | 'quiz'
  | 'dashboard'
  | 'auth'
  | 'profile';

export type UiLanguage = 'en' | 'bn';

export type EnglishLevel =
  | 'Beginner'
  | 'Elementary'
  | 'Intermediate'
  | 'Upper Intermediate'
  | 'Advanced';

export interface LessonExercise {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanationEn: string;
  explanationBn: string;
}

export interface LessonExample {
  en: string;
  bn: string;
  note?: string;
}

export interface EnglishLesson {
  id: string;
  title: string;
  titleBn: string;
  level: EnglishLevel;
  category: 'Grammar' | 'Vocabulary' | 'Speaking' | 'Listening' | 'Reading' | 'Writing';
  durationMinutes: number;
  summary: string;
  summaryBn: string;
  explanationEn: string[];
  explanationBn: string[];
  examples: LessonExample[];
  exercises: LessonExercise[];
}

export interface BanglaComparison {
  incorrect: string;
  correct: string;
  note: string;
}

export interface BanglaTopic {
  id: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  explanationBn: string[];
  rulesBn: string[];
  comparisons: BanglaComparison[];
  examplesBn: { text: string; meaning: string }[];
  exercises: LessonExercise[];
}

export interface DictionaryEntry {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  banglaMeaning: string;
  englishDefinition: string;
  examples: { en: string; bn: string }[];
  synonyms: string[];
  antonyms: string[];
  usageTip?: string;
}

export interface VocabWord extends DictionaryEntry {
  id: string;
  level: EnglishLevel;
  category: string;
}

export interface QuizQuestion {
  id: string;
  category: 'Vocabulary' | 'Grammar' | 'Translation' | 'Listening' | 'Reading';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  prompt: string;
  passage?: string;
  audioPrompt?: string;
  options: string[];
  correctIndex: number;
  explanationEn: string;
  explanationBn: string;
}

export interface SavedWord {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  banglaMeaning: string;
  englishDefinition: string;
  exampleEn: string;
  exampleBn: string;
  savedAt: string;
}

export interface QuizResultRecord {
  id: string;
  category: string;
  level: string;
  score: number;
  total: number;
  percentage: number;
  date: string;
}

export interface TranslationRecord {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  createdAt: string;
}

export interface SpeakingRecord {
  id: string;
  topic: string;
  userText: string;
  correctedText: string;
  feedback: string;
  createdAt: string;
}

export interface ActivityRecord {
  id: string;
  title: string;
  titleBn: string;
  type: 'lesson' | 'vocabulary' | 'quiz' | 'translator' | 'speaking' | 'grammar';
  timestamp: string;
}

export interface UserProgress {
  completedLessons: string[];
  learnedWords: string[];
  savedWords: SavedWord[];
  routineDate: string;
  completedRoutineIds: string[];
  quizHistory: QuizResultRecord[];
  translationHistory: TranslationRecord[];
  savedTranslations: TranslationRecord[];
  speakingHistory: SpeakingRecord[];
  streakDays: number;
  lastActiveDate: string;
  weeklyActivity: number[];
  recentActivities: ActivityRecord[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  level: string;
  dailyGoal: number;
  createdAt: string;
}
