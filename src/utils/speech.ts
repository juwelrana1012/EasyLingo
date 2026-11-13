const LANG_BCP47: Record<string, string> = {
  English: 'en-US',
  Bengali: 'bn-BD',
  'Bengali (বাংলা)': 'bn-BD',
  Hindi: 'hi-IN',
  Arabic: 'ar-SA',
  Spanish: 'es-ES',
  French: 'fr-FR',
  German: 'de-DE',
  Japanese: 'ja-JP',
  Chinese: 'zh-CN',
};

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function detectLanguageBcp47(text: string, hintLang?: string): string {
  if (hintLang && LANG_BCP47[hintLang]) {
    return LANG_BCP47[hintLang];
  }
  if (hintLang && /^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/i.test(hintLang)) {
    return hintLang;
  }
  // Detect Bengali Unicode block U+0980–U+09FF
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'bn-BD';
  }
  return 'en-US';
}

export function speakText(
  text: string,
  lang?: string,
  onStart?: () => void,
  onEnd?: () => void
): boolean {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const resolvedLang = detectLanguageBcp47(text, lang);
    utterance.lang = resolvedLang;
    utterance.rate = 0.94;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) =>
      v.lang.toLowerCase().startsWith(resolvedLang.slice(0, 2).toLowerCase())
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
