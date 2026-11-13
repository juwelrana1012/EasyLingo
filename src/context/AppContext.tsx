import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppTheme, findThemeById } from '../data/themes';
import { BASE_UI_STRINGS, BENGALI_UI_STRINGS, UiDictionary, UiStringKey } from '../data/uiStrings';
import { CountryLanguage, WORLD_COUNTRIES_195 } from '../data/worldCountries';
import { SavedWord, TranslationRecord } from '../types';
import { postJson } from '../utils/apiClient';

export type AppView = 'home' | 'workspace' | 'language' | 'themes';

export type WorkspaceTopicId =
  | 'word-meaning'
  | 'translator'
  | 'speaking'
  | 'sentences'
  | 'grammar'
  | 'english'
  | 'bangla'
  | 'vocabulary';

const STORAGE_THEME_KEY = 'lingobangla_theme_id_v5';
const STORAGE_COUNTRY_KEY = 'lingobangla_country_iso_v2';
const STORAGE_UI_CACHE_PREFIX = 'lingobangla_ui_bundle_v3_';
const STORAGE_DATA_KEY = 'lingobangla_user_data_v2';

interface LocalWorkspaceData {
  completedLessons: string[];
  learnedWords: string[];
  savedWords: SavedWord[];
  translationHistory: TranslationRecord[];
  savedTranslations: TranslationRecord[];
}

function loadLocalData(): LocalWorkspaceData {
  try {
    const raw = localStorage.getItem(STORAGE_DATA_KEY);
    if (raw) {
      return {
        completedLessons: [],
        learnedWords: [],
        savedWords: [],
        translationHistory: [],
        savedTranslations: [],
        ...JSON.parse(raw),
      };
    }
  } catch {
    // ignore
  }
  return {
    completedLessons: [],
    learnedWords: [],
    savedWords: [],
    translationHistory: [],
    savedTranslations: [],
  };
}

interface AppContextValue {
  view: AppView;
  enterWorkspace: (topic?: WorkspaceTopicId) => void;
  goHome: () => void;
  openLanguagePage: () => void;
  openThemesPage: () => void;
  goBackFromSettings: () => void;
  activeTopic: WorkspaceTopicId;
  setActiveTopic: (topic: WorkspaceTopicId) => void;

  // 195-country global UI language
  selectedCountry: CountryLanguage;
  selectCountryLanguage: (country: CountryLanguage) => Promise<void>;
  translatingUi: boolean;
  t: (key: UiStringKey) => string;

  // 39 Theme Studio themes
  activeTheme: AppTheme;
  setThemeById: (themeId: string) => void;

  // Progress & Saved items
  data: LocalWorkspaceData;
  toggleLessonComplete: (id: string) => void;
  toggleWordLearned: (id: string) => void;
  toggleSaveWord: (entry: Omit<SavedWord, 'savedAt'>) => void;
  isWordSaved: (word: string) => boolean;
  recordTranslation: (item: Omit<TranslationRecord, 'id' | 'createdAt'>) => void;
  toggleSaveTranslation: (item: Omit<TranslationRecord, 'id' | 'createdAt'>) => void;
  isTranslationSaved: (sourceText: string, translatedText: string) => boolean;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<AppView>(() => {
    if (typeof window === 'undefined') return 'home';
    const h = window.location.hash;
    if (h === '#/language') return 'language';
    if (h === '#/themes') return 'themes';
    if (h.startsWith('#/workspace')) return 'workspace';
    return 'home';
  });

  const [previousMainView, setPreviousMainView] = useState<'home' | 'workspace'>('home');

  const [activeTopic, setActiveTopicState] = useState<WorkspaceTopicId>(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.hash.match(/^#\/workspace\/([a-z-]+)/);
      if (match?.[1]) return match[1] as WorkspaceTopicId;
    }
    return 'word-meaning';
  });

  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'fresh-white';
    return (
      localStorage.getItem(STORAGE_THEME_KEY) ||
      localStorage.getItem('lingobangla_theme_id_v4') ||
      localStorage.getItem('lingobangla_theme_id_v3') ||
      'fresh-white'
    );
  });

  const activeTheme = useMemo(() => findThemeById(activeThemeId), [activeThemeId]);

  useEffect(() => {
    const root = document.documentElement;
    const c = activeTheme.colors;
    root.style.setProperty('--lb-bg', c.bg);
    root.style.setProperty('--lb-surface', c.surface);
    root.style.setProperty('--lb-surface-alt', c.surfaceAlt);
    root.style.setProperty('--lb-border', c.border);
    root.style.setProperty('--lb-text', c.text);
    root.style.setProperty('--lb-muted', c.muted);
    root.style.setProperty('--lb-primary', c.primary);
    root.style.setProperty('--lb-primary-text', c.primaryText);
    root.style.setProperty('--lb-accent-2', c.accent2);
    root.style.setProperty('--lb-accent-3', c.accent3);
    root.style.setProperty('--lb-accent-4', c.accent4);
    root.style.setProperty('--lb-accent-5', c.accent5);
    root.style.setProperty('--lb-hero-from', c.heroFrom);
    root.style.setProperty('--lb-hero-to', c.heroTo);

    if (activeTheme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_THEME_KEY, activeTheme.id);
  }, [activeTheme]);

  const [selectedCountry, setSelectedCountry] = useState<CountryLanguage>(() => {
    if (typeof window === 'undefined') return WORLD_COUNTRIES_195[1];
    const savedIso = localStorage.getItem(STORAGE_COUNTRY_KEY);
    return (
      WORLD_COUNTRIES_195.find((c) => c.iso2 === savedIso) ||
      WORLD_COUNTRIES_195.find((c) => c.iso2 === 'US') ||
      WORLD_COUNTRIES_195[0]
    );
  });

  const [uiStrings, setUiStrings] = useState<UiDictionary>(BASE_UI_STRINGS);
  const [translatingUi, setTranslatingUi] = useState(false);

  const loadUiStringsForCountry = useCallback(async (country: CountryLanguage) => {
    const langLower = country.language.toLowerCase();
    if (langLower === 'english' || langLower.startsWith('english (')) {
      setUiStrings(BASE_UI_STRINGS);
      return;
    }
    if (langLower === 'bengali') {
      setUiStrings(BENGALI_UI_STRINGS);
      return;
    }

    const cacheKey = `${STORAGE_UI_CACHE_PREFIX}${country.iso2}_${country.language}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setUiStrings({ ...BASE_UI_STRINGS, ...JSON.parse(cached) });
        return;
      }
    } catch {
      // ignore
    }

    setTranslatingUi(true);
    try {
      const data = await postJson<{ translations?: Record<string, string> }>('/api/ui-translate', {
        targetLanguage: `${country.language} (${country.country})`,
        strings: BASE_UI_STRINGS,
      });
      if (data.translations) {
        const merged = { ...BASE_UI_STRINGS, ...data.translations };
        setUiStrings(merged);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data.translations));
        } catch {
          // ignore
        }
      }
    } catch {
      // keep current UI strings
    } finally {
      setTranslatingUi(false);
    }
  }, []);

  useEffect(() => {
    loadUiStringsForCountry(selectedCountry);
  }, [selectedCountry, loadUiStringsForCountry]);

  const selectCountryLanguage = useCallback(
    async (country: CountryLanguage) => {
      setSelectedCountry(country);
      localStorage.setItem(STORAGE_COUNTRY_KEY, country.iso2);
      await loadUiStringsForCountry(country);
    },
    [loadUiStringsForCountry]
  );

  const t = useCallback(
    (key: UiStringKey) => uiStrings[key] || BASE_UI_STRINGS[key],
    [uiStrings]
  );

  const [data, setData] = useState<LocalWorkspaceData>(() => loadLocalData());

  const updateData = useCallback((updater: (prev: LocalWorkspaceData) => LocalWorkspaceData) => {
    setData((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash;
      if (h === '#/language') {
        setView('language');
      } else if (h === '#/themes') {
        setView('themes');
      } else if (h.startsWith('#/workspace')) {
        setView('workspace');
        setPreviousMainView('workspace');
        const m = h.match(/^#\/workspace\/([a-z-]+)/);
        if (m?.[1]) setActiveTopicState(m[1] as WorkspaceTopicId);
      } else {
        setView('home');
        setPreviousMainView('home');
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const enterWorkspace = useCallback((topic: WorkspaceTopicId = 'word-meaning') => {
    setActiveTopicState(topic);
    setPreviousMainView('workspace');
    setView('workspace');
    window.location.hash = `#/workspace/${topic}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goHome = useCallback(() => {
    setPreviousMainView('home');
    setView('home');
    window.location.hash = '#/home';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openLanguagePage = useCallback(() => {
    if (view === 'home' || view === 'workspace') {
      setPreviousMainView(view);
    }
    setView('language');
    window.location.hash = '#/language';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const openThemesPage = useCallback(() => {
    if (view === 'home' || view === 'workspace') {
      setPreviousMainView(view);
    }
    setView('themes');
    window.location.hash = '#/themes';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const goBackFromSettings = useCallback(() => {
    if (previousMainView === 'workspace') {
      setView('workspace');
      window.location.hash = `#/workspace/${activeTopic}`;
    } else {
      setView('home');
      window.location.hash = '#/home';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [previousMainView, activeTopic]);

  const setActiveTopic = useCallback((topic: WorkspaceTopicId) => {
    setActiveTopicState(topic);
    window.location.hash = `#/workspace/${topic}`;
  }, []);

  const toggleLessonComplete = useCallback(
    (id: string) => {
      updateData((prev) => ({
        ...prev,
        completedLessons: prev.completedLessons.includes(id)
          ? prev.completedLessons.filter((x) => x !== id)
          : [...prev.completedLessons, id],
      }));
    },
    [updateData]
  );

  const toggleWordLearned = useCallback(
    (id: string) => {
      updateData((prev) => ({
        ...prev,
        learnedWords: prev.learnedWords.includes(id)
          ? prev.learnedWords.filter((x) => x !== id)
          : [...prev.learnedWords, id],
      }));
    },
    [updateData]
  );

  const toggleSaveWord = useCallback(
    (entry: Omit<SavedWord, 'savedAt'>) => {
      updateData((prev) => {
        const exists = prev.savedWords.some(
          (w) => w.word.toLowerCase() === entry.word.toLowerCase()
        );
        return {
          ...prev,
          savedWords: exists
            ? prev.savedWords.filter((w) => w.word.toLowerCase() !== entry.word.toLowerCase())
            : [{ ...entry, savedAt: new Date().toISOString() }, ...prev.savedWords],
        };
      });
    },
    [updateData]
  );

  const isWordSaved = useCallback(
    (word: string) => data.savedWords.some((w) => w.word.toLowerCase() === word.toLowerCase()),
    [data.savedWords]
  );

  const recordTranslation = useCallback(
    (item: Omit<TranslationRecord, 'id' | 'createdAt'>) => {
      updateData((prev) => {
        const record: TranslationRecord = {
          ...item,
          id: `${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        const deduped = prev.translationHistory.filter(
          (tr) => !(tr.sourceText === item.sourceText && tr.targetLang === item.targetLang)
        );
        return {
          ...prev,
          translationHistory: [record, ...deduped].slice(0, 20),
        };
      });
    },
    [updateData]
  );

  const toggleSaveTranslation = useCallback(
    (item: Omit<TranslationRecord, 'id' | 'createdAt'>) => {
      updateData((prev) => {
        const exists = prev.savedTranslations.some(
          (tr) => tr.sourceText === item.sourceText && tr.translatedText === item.translatedText
        );
        return {
          ...prev,
          savedTranslations: exists
            ? prev.savedTranslations.filter(
                (tr) =>
                  !(tr.sourceText === item.sourceText && tr.translatedText === item.translatedText)
              )
            : [
                { ...item, id: `${Date.now()}`, createdAt: new Date().toISOString() },
                ...prev.savedTranslations,
              ],
        };
      });
    },
    [updateData]
  );

  const isTranslationSaved = useCallback(
    (sourceText: string, translatedText: string) =>
      data.savedTranslations.some(
        (tr) => tr.sourceText === sourceText && tr.translatedText === translatedText
      ),
    [data.savedTranslations]
  );

  return (
    <AppContext.Provider
      value={{
        view,
        enterWorkspace,
        goHome,
        openLanguagePage,
        openThemesPage,
        goBackFromSettings,
        activeTopic,
        setActiveTopic,
        selectedCountry,
        selectCountryLanguage,
        translatingUi,
        t,
        activeTheme,
        setThemeById: setActiveThemeId,
        data,
        toggleLessonComplete,
        toggleWordLearned,
        toggleSaveWord,
        isWordSaved,
        recordTranslation,
        toggleSaveTranslation,
        isTranslationSaved,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
