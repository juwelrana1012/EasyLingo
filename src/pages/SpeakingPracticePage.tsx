import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Loader2,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { postJson } from '../utils/apiClient';
import { getFastCache, setFastCache } from '../utils/fastCache';
import { speakText } from '../utils/speech';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string; confidence: number };
  }>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

const TOPICS = [
  {
    id: 'Daily Life',
    prompt: 'Hello! How has your day been going so far?',
    promptBn: 'হ্যালো! আপনার আজকের দিনটি এখন পর্যন্ত কেমন কাটছে?',
  },
  {
    id: 'Job Interview',
    prompt: 'Tell me about your strengths and what you enjoy learning.',
    promptBn: 'আপনার দক্ষতা এবং আপনি কী শিখতে ভালোবাসেন সে সম্পর্কে বলুন।',
  },
  {
    id: 'Travel & Airport',
    prompt: 'Good morning! Where are you flying today, and do you have luggage to check in?',
    promptBn: 'শুভ সকাল! আপনি আজ কোথায় যাচ্ছেন এবং আপনার কি কোনো লাগেজ আছে?',
  },
  {
    id: 'Ordering Food',
    prompt: 'Welcome! What would you like to order for lunch today?',
    promptBn: 'স্বাগতম! আজ দুপুরের খাবারে আপনি কী অর্ডার করতে চান?',
  },
];

interface VoiceTurnResult {
  userSpoke: string;
  whatYouSaidMeaning: string;
  naturalCorrection: string;
  tutorReply: string;
  tutorReplyMeaning: string;
  feedbackEn: string;
  feedbackBn: string;
  wordBreakdown: Array<{ word: string; meaning: string }>;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function SpeakingPracticePage() {
  const { selectedCountry } = useApp();
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [currentQuestion, setCurrentQuestion] = useState(TOPICS[0].prompt);
  const [currentQuestionBn, setCurrentQuestionBn] = useState(TOPICS[0].promptBn);
  const [autoSpeakReply, setAutoSpeakReply] = useState(true);
  const [autoSendOnStop, setAutoSendOnStop] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [speechSupported] = useState(() => Boolean(getSpeechRecognitionCtor()));
  const [transcript, setTranscript] = useState('');
  const [speechError, setSpeechError] = useState('');

  const [analyzing, setAnalyzing] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [turns, setTurns] = useState<VoiceTurnResult[]>([]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const latestTranscriptRef = useRef('');

  const meaningLang = selectedCountry.language.startsWith('English')
    ? 'Bengali'
    : selectedCountry.language;

  useEffect(() => {
    latestTranscriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    // Pre-warm speech voices for instant playback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      abortRef.current?.abort();
    };
  }, []);

  const handleTopicChange = (topicId: string) => {
    const found = TOPICS.find((t) => t.id === topicId) || TOPICS[0];
    setSelectedTopic(found);
    setCurrentQuestion(found.prompt);
    setCurrentQuestionBn(found.promptBn);
    setTranscript('');
    setTurns([]);
    setSpeechError('');
    setFeedbackError('');
  };

  const startRecording = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError('Voice recognition is unsupported in this browser. Use Chrome/Edge or type below.');
      return;
    }

    setSpeechError('');
    setFeedbackError('');

    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalText = '';

    recognition.onstart = () => {
      setIsRecording(true);
      setMicDenied(false);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalText += `${res[0].transcript} `;
        } else {
          interim += res[0].transcript;
        }
      }
      setTranscript((finalText + interim).trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      setIsRecording(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicDenied(true);
        setSpeechError('Microphone permission denied. Please enable microphone access in your browser.');
      } else if (event.error === 'no-speech') {
        setSpeechError('No speech heard. Please speak clearly into your microphone.');
      } else {
        setSpeechError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (autoSendOnStop && latestTranscriptRef.current.trim()) {
        void submitSpeech(latestTranscriptRef.current.trim());
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsRecording(false);
      setSpeechError('Could not start microphone.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
  };

  const submitSpeech = useCallback(
    async (rawText: string) => {
      const clean = rawText.trim();
      if (!clean) return;

      const cacheKey = `${meaningLang}:${selectedTopic.id}:${clean.toLowerCase()}`;
      const cached = getFastCache<Omit<VoiceTurnResult, 'userSpoke'>>('spk', cacheKey);
      if (cached) {
        const turn: VoiceTurnResult = { userSpoke: clean, ...cached };
        setTurns((prev) => [turn, ...prev]);
        setCurrentQuestion(turn.tutorReply);
        setCurrentQuestionBn(turn.tutorReplyMeaning);
        setTranscript('');
        if (autoSpeakReply && turn.tutorReply) speakText(turn.tutorReply, 'English');
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setAnalyzing(true);
      setFeedbackError('');

      try {
        const json = await postJson<Omit<VoiceTurnResult, 'userSpoke'>>(
          '/api/speaking/feedback',
          {
            topic: selectedTopic.id,
            promptQuestion: currentQuestion,
            transcript: clean,
            meaningLanguage: meaningLang,
          },
          { signal: controller.signal, fallbackError: 'Could not evaluate spoken response.' }
        );

        const payload = {
          whatYouSaidMeaning: json.whatYouSaidMeaning,
          naturalCorrection: json.naturalCorrection,
          tutorReply: json.tutorReply,
          tutorReplyMeaning: json.tutorReplyMeaning,
          feedbackEn: json.feedbackEn,
          feedbackBn: json.feedbackBn,
          wordBreakdown: Array.isArray(json.wordBreakdown) ? json.wordBreakdown : [],
        };
        setFastCache('spk', cacheKey, payload);

        const turn: VoiceTurnResult = { userSpoke: clean, ...payload };
        setTurns((prev) => [turn, ...prev]);
        setCurrentQuestion(turn.tutorReply);
        setCurrentQuestionBn(turn.tutorReplyMeaning);
        setTranscript('');

        if (autoSpeakReply && turn.tutorReply) {
          speakText(turn.tutorReply, 'English');
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setFeedbackError(err instanceof Error ? err.message : 'Unable to process conversation.');
        }
      } finally {
        setAnalyzing(false);
      }
    },
    [selectedTopic.id, currentQuestion, meaningLang, autoSpeakReply]
  );

  const handleSendSpeech = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isRecording) stopRecording();
    await submitSpeech(transcript);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold lb-text">Voice English Conversation Practice</h2>
          <p className="text-sm lb-muted font-bengali mt-0.5">
            মাইক্রোফোন চালু করে ইংরেজিতে কথা বলুন—সিস্টেম আপনার কথার প্রতিটি শব্দের অর্থসহ বুঝিয়ে দেবে এবং উত্তর দেবে।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setAutoSendOnStop((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer whitespace-nowrap ${
              autoSendOnStop ? 'lb-btn-primary border-transparent' : 'lb-surface lb-border lb-text'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{autoSendOnStop ? 'Auto-Reply on Stop: ON' : 'Auto-Reply on Stop: OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoSpeakReply((v) => !v)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl lb-surface border lb-border text-xs font-bold lb-text cursor-pointer whitespace-nowrap"
          >
            {autoSpeakReply ? (
              <Volume2 className="w-4 h-4" style={{ color: 'var(--lb-primary)' }} />
            ) : (
              <VolumeX className="w-4 h-4 lb-muted" />
            )}
            <span>{autoSpeakReply ? 'Auto Voice: ON' : 'Auto Voice: OFF'}</span>
          </button>
        </div>
      </div>

      {!speechSupported && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-start gap-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>
            Live microphone speech recognition requires Chrome or Edge. You can still listen to voice prompts and type your reply below.
          </span>
        </div>
      )}

      {micDenied && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-[#DC2626]">
          Microphone access is blocked. Allow microphone permission in your browser to talk.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Voice Controls */}
        <div className="lg:col-span-5 lb-surface border lb-border rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="voice-topic" className="text-xs font-bold lb-muted">
              Topic:
            </label>
            <select
              id="voice-topic"
              value={selectedTopic.id}
              onChange={(e) => handleTopicChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl lb-surface-alt border lb-border lb-text text-sm font-semibold focus:outline-none"
            >
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-xl lb-surface-alt border lb-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: 'var(--lb-primary)' }}>
                Speaking Partner Says:
              </span>
              <button
                type="button"
                onClick={() => speakText(currentQuestion, 'English')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg lb-surface border lb-border text-xs font-bold lb-text cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" style={{ color: 'var(--lb-primary)' }} />
                <span>Play Voice</span>
              </button>
            </div>
            <p className="text-base font-bold lb-text">&ldquo;{currentQuestion}&rdquo;</p>
            <p className="text-xs sm:text-sm lb-muted font-bengali">{currentQuestionBn}</p>
          </div>

          {/* Microphone Trigger */}
          <div className="flex flex-col items-center py-3 space-y-2.5">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!speechSupported}
              className="w-24 h-24 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 cursor-pointer disabled:opacity-40"
              style={{
                backgroundColor: isRecording ? '#DC2626' : 'var(--lb-primary)',
              }}
              aria-label={isRecording ? 'Stop speaking' : 'Start speaking'}
            >
              {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
            </button>
            <p className="text-sm font-bold lb-text">
              {isRecording ? 'Listening... Click to Stop' : 'Tap Mic & Speak English'}
            </p>
            {speechError && <p className="text-xs text-[#DC2626] text-center">{speechError}</p>}
          </div>

          <form onSubmit={handleSendSpeech} className="space-y-3">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
              placeholder="Your spoken words appear here (or type your reply)..."
              className="w-full rounded-xl lb-surface-alt border lb-border p-3.5 text-sm lb-text focus:outline-none"
            />
            {feedbackError && <p className="text-xs text-[#DC2626]">{feedbackError}</p>}
            <button
              type="submit"
              disabled={analyzing || !transcript.trim()}
              className="w-full py-3 rounded-xl font-bold text-sm lb-btn-primary disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{analyzing ? 'Understanding & Replying...' : 'Send & Get Word Meanings + Reply'}</span>
            </button>
          </form>
        </div>

        {/* Right: Word-Meaning Breakdown & Voice Dialogue */}
        <div className="lg:col-span-7 space-y-4">
          {turns.length === 0 ? (
            <div className="lb-surface border lb-border rounded-2xl p-8 text-center space-y-2">
              <BookOpen className="w-8 h-8 mx-auto lb-muted" />
              <h3 className="text-base font-bold lb-text">Live Conversation & Word Meaning Coach</h3>
              <p className="text-sm lb-muted max-w-md mx-auto font-bengali">
                আপনি মাইক্রোফোনে কথা বলে পাঠালে এখানে দেখাবে: আপনি যা বলেছেন তার অর্থ, প্রতিটি গুরুত্বপূর্ণ শব্দের অর্থ (Word Meanings), সঠিক বাক্য এবং কথোপকথনের পরবর্তী উত্তর।
              </p>
            </div>
          ) : (
            turns.map((turn, idx) => (
              <div
                key={idx}
                className="lb-surface border lb-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs"
              >
                <div className="p-3.5 rounded-xl lb-surface-alt border lb-border space-y-1">
                  <span className="text-xs font-bold lb-muted">You Said:</span>
                  <p className="text-sm sm:text-base font-bold lb-text">&ldquo;{turn.userSpoke}&rdquo;</p>
                  <p className="text-xs sm:text-sm font-bengali" style={{ color: 'var(--lb-primary)' }}>
                    অর্থ: {turn.whatYouSaidMeaning}
                  </p>
                </div>

                {/* Word-by-Word Breakdown */}
                {turn.wordBreakdown.length > 0 && (
                  <div>
                    <div className="text-xs font-bold lb-muted mb-2">
                      Word Meanings Breakdown ({meaningLang}):
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {turn.wordBreakdown.map((wb, wIdx) => (
                        <div
                          key={wIdx}
                          className="p-2.5 rounded-xl lb-surface-alt border lb-border text-xs"
                        >
                          <div className="font-bold lb-text">{wb.word}</div>
                          <div className="lb-muted font-bengali mt-0.5">{wb.meaning}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Natural Corrected Version */}
                <div className="p-3.5 rounded-xl border lb-border lb-surface-alt space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: 'var(--lb-accent-2)' }}>
                      Better / Natural Sentence:
                    </span>
                    <button
                      type="button"
                      onClick={() => speakText(turn.naturalCorrection, 'English')}
                      className="inline-flex items-center gap-1 text-xs font-bold cursor-pointer"
                      style={{ color: 'var(--lb-accent-2)' }}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Hear</span>
                    </button>
                  </div>
                  <p className="text-sm font-bold lb-text">{turn.naturalCorrection}</p>
                  <p className="text-xs lb-muted font-bengali">{turn.feedbackBn}</p>
                </div>

                {/* Partner Reply */}
                <div className="p-4 rounded-xl border lb-border lb-surface space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: 'var(--lb-primary)' }}>
                      Partner&apos;s Reply:
                    </span>
                    <button
                      type="button"
                      onClick={() => speakText(turn.tutorReply, 'English')}
                      className="inline-flex items-center gap-1 text-xs font-bold cursor-pointer"
                      style={{ color: 'var(--lb-primary)' }}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen</span>
                    </button>
                  </div>
                  <p className="text-sm sm:text-base font-bold lb-text">{turn.tutorReply}</p>
                  <p className="text-xs lb-muted font-bengali">{turn.tutorReplyMeaning}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
