import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const FAST_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-4-hydrogen';

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

// Fast bounded in-memory LRU cache for instant (<2ms) repeat responses
const MAX_CACHE_ENTRIES = 1000;
const responseCache = new Map<string, unknown>();

function getCached<T>(key: string): T | undefined {
  const hit = responseCache.get(key);
  if (hit !== undefined) {
    responseCache.delete(key);
    responseCache.set(key, hit);
    return hit as T;
  }
  return undefined;
}

function setCached(key: string, value: unknown) {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey !== undefined) responseCache.delete(oldestKey);
  }
  responseCache.set(key, value);
}

function safeJsonParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const startObj = cleaned.indexOf('{');
    const endObj = cleaned.lastIndexOf('}');
    if (startObj !== -1 && endObj > startObj) {
      return JSON.parse(cleaned.slice(startObj, endObj + 1)) as T;
    }
    throw new Error('Invalid JSON response from AI');
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function runWithFastModel<T>(
  runner: (model: string, thinkingLevel: ThinkingLevel) => Promise<T>,
  primaryTimeoutMs = 7000
): Promise<T> {
  try {
    return await withTimeout(runner(FAST_MODEL, ThinkingLevel.MINIMAL), primaryTimeoutMs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('GEMINI_API_KEY') ||
      msg.includes('403') ||
      msg.includes('PERMISSION_DENIED') ||
      msg.includes('API_KEY_INVALID')
    ) {
      throw err;
    }
    // Instant fallback to gemini-4-hydrogen (LOW) if fast-lite blips or stalls
    return await runner(FALLBACK_MODEL, ThinkingLevel.LOW);
  }
}

export async function translateWithGemini(params: {
  text: string;
  sourceLang: string;
  targetLang: string;
}) {
  const cacheKey = `tr:${params.sourceLang}:${params.targetLang}:${params.text}`;
  const hit = getCached<Record<string, string>>(cacheKey);
  if (hit) return hit;

  const ai = getClient();
  const srcHint =
    params.sourceLang === 'Auto Detect' ? 'Auto-detect source' : `From ${params.sourceLang}`;

  const parsed = await runWithFastModel(async (model, thinkingLevel) => {
    const response = await ai.models.generateContent({
      model,
      contents: `${srcHint} -> ${params.targetLang}. Translate naturally:\n${params.text}`,
      config: {
        thinkingConfig: { thinkingLevel },
        systemInstruction:
          'Fast accurate 195-language translator. Keep transliteration & notes brief (max 1 short sentence).',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING },
            transliteration: { type: Type.STRING },
            notes: { type: Type.STRING },
          },
          required: ['translatedText', 'detectedLanguage', 'transliteration', 'notes'],
        },
      },
    });
    return safeJsonParse<Record<string, string>>(response.text, {
      translatedText: '',
      detectedLanguage: params.sourceLang,
      transliteration: '',
      notes: '',
    });
  });

  if (parsed?.translatedText) setCached(cacheKey, parsed);
  return parsed;
}

export async function lookupDictionaryWithGemini(params: {
  word: string;
  meaningLanguage?: string;
}) {
  const meaningLang = params.meaningLanguage || 'Bengali';
  const cacheKey = `dict:${meaningLang}:${params.word.toLowerCase()}`;
  const hit = getCached<Record<string, unknown>>(cacheKey);
  if (hit) return hit;

  const ai = getClient();
  const parsed = await runWithFastModel(async (model, thinkingLevel) => {
    const response = await ai.models.generateContent({
      model,
      contents: `Word: "${params.word}". Target: ${meaningLang}. Give IPA, POS, ${meaningLang} meaning, short English definition, 3 short example sentences with ${meaningLang} translations, 3 synonyms, 3 antonyms, 1 short tip.`,
      config: {
        thinkingConfig: { thinkingLevel },
        systemInstruction: 'Ultra-fast bilingual lexicographer. Be accurate and concise.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            banglaMeaning: { type: Type.STRING },
            englishDefinition: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  bn: { type: Type.STRING },
                },
                required: ['en', 'bn'],
              },
            },
            synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
            antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
            usageTip: { type: Type.STRING },
          },
          required: [
            'word',
            'phonetic',
            'partOfSpeech',
            'banglaMeaning',
            'englishDefinition',
            'examples',
            'synonyms',
            'antonyms',
            'usageTip',
          ],
        },
      },
    });
    return safeJsonParse<Record<string, unknown>>(response.text, {});
  });

  if (parsed?.word) setCached(cacheKey, parsed);
  return parsed;
}

export async function generateBulkWordsWithGemini(params: {
  topic: string;
  count: number;
  meaningLanguage: string;
  excludeWords?: string[];
}) {
  const ai = getClient();
  const safeCount = Math.min(Math.max(params.count, 5), 50);
  const excludeNote =
    params.excludeWords && params.excludeWords.length > 0
      ? ` Avoid: ${params.excludeWords.slice(-80).join(', ')}.`
      : '';

  return await runWithFastModel(async (model, thinkingLevel) => {
    const response = await ai.models.generateContent({
      model,
      contents: `Topic: "${params.topic}". Generate ${safeCount} unique English words with IPA, POS, brief ${params.meaningLanguage} meaning, and 1 short example + ${params.meaningLanguage} translation.${excludeNote}`,
      config: {
        thinkingConfig: { thinkingLevel },
        systemInstruction: 'Fast vocabulary builder. Keep meanings and sentences short and clear.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  phonetic: { type: Type.STRING },
                  partOfSpeech: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  exampleEn: { type: Type.STRING },
                  exampleTranslated: { type: Type.STRING },
                },
                required: ['word', 'phonetic', 'partOfSpeech', 'meaning', 'exampleEn', 'exampleTranslated'],
              },
            },
          },
          required: ['items'],
        },
      },
    });
    return safeJsonParse(response.text, { items: [] });
  }, 15000);
}

export async function generateSentencesWithGemini(params: {
  input: string;
  meaningLanguage: string;
  focus?: string;
}) {
  const focus = params.focus || 'All Tenses & Contexts';
  const cacheKey = `sent:${params.meaningLanguage}:${focus}:${params.input.toLowerCase()}`;
  const hit = getCached<Record<string, unknown>>(cacheKey);
  if (hit) return hit;

  const ai = getClient();
  const parsed = await runWithFastModel(async (model, thinkingLevel) => {
    const response = await ai.models.generateContent({
      model,
      contents: `Input: "${params.input}". Focus: ${focus}. Meaning language: ${params.meaningLanguage}. Give short structureFormula, 1-line structureNote, and 4 natural English sentences (Statement, Question, Past, Daily Conversation) with ${params.meaningLanguage} translations and brief 6-word grammarTips.`,
      config: {
        thinkingConfig: { thinkingLevel },
        systemInstruction: 'Ultra-fast English sentence coach. Keep everything crisp and practical.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            structureFormula: { type: Type.STRING },
            structureNote: { type: Type.STRING },
            sentences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  english: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  grammarTip: { type: Type.STRING },
                },
                required: ['label', 'english', 'translation', 'grammarTip'],
              },
            },
          },
          required: ['structureFormula', 'structureNote', 'sentences'],
        },
      },
    });
    return safeJsonParse<Record<string, unknown>>(response.text, {});
  });

  if (parsed?.sentences) setCached(cacheKey, parsed);
  return parsed;
}

export async function checkGrammarWithGemini(params: { text: string; language: 'en' | 'bn' }) {
  const cacheKey = `gram:${params.language}:${params.text}`;
  const hit = getCached<Record<string, unknown>>(cacheKey);
  if (hit) return hit;

  const ai = getClient();
  const prompt =
    params.language === 'bn'
      ? `Check Bengali spelling, punctuation, grammar. Keep explanations brief:\n${params.text}`
      : `Check English grammar, spelling, phrasing. Explain errors briefly in English & Bengali:\n${params.text}`;

  const parsed = await runWithFastModel(async (model, thinkingLevel) => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel },
        systemInstruction: 'Fast accurate grammar checker. Only flag real mistakes.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasErrors: { type: Type.BOOLEAN },
            correctedText: { type: Type.STRING },
            overallFeedback: { type: Type.STRING },
            overallFeedbackBn: { type: Type.STRING },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  correction: { type: Type.STRING },
                  type: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  explanationBn: { type: Type.STRING },
                },
                required: ['original', 'correction', 'type', 'explanation', 'explanationBn'],
              },
            },
          },
          required: ['hasErrors', 'correctedText', 'overallFeedback', 'overallFeedbackBn', 'issues'],
        },
      },
    });
    return safeJsonParse<Record<string, unknown>>(response.text, {});
  });

  if (parsed?.correctedText !== undefined) setCached(cacheKey, parsed);
  return parsed;
}

export async function analyzeSpeakingWithGemini(params: {
  topic: string;
  promptQuestion: string;
  transcript: string;
  meaningLanguage?: string;
}) {
  const meaningLang = params.meaningLanguage || 'Bengali';
  const cacheKey = `spk:${meaningLang}:${params.topic}:${params.transcript.toLowerCase()}`;
  const hit = getCached<Record<string, unknown>>(cacheKey);
  if (hit) return hit;

  const ai = getClient();
  const parsed = await runWithFastModel(async (model, thinkingLevel) => {
    const response = await ai.models.generateContent({
      model,
      contents: `Topic: ${params.topic}. Asked: "${params.promptQuestion}". User said: "${params.transcript}".
Keep every field short (1 brief sentence max):
- whatYouSaidMeaning (${meaningLang})
- naturalCorrection (clean English)
- tutorReply (1 short spoken reply/question)
- tutorReplyMeaning (${meaningLang})
- feedbackEn & feedbackBn (1 short phrase each)
- wordBreakdown (3 key words with ${meaningLang} meaning)`,
      config: {
        thinkingConfig: { thinkingLevel },
        systemInstruction: 'Ultra-fast voice speaking partner. Reply briefly and naturally.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whatYouSaidMeaning: { type: Type.STRING },
            naturalCorrection: { type: Type.STRING },
            tutorReply: { type: Type.STRING },
            tutorReplyMeaning: { type: Type.STRING },
            feedbackEn: { type: Type.STRING },
            feedbackBn: { type: Type.STRING },
            wordBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                },
                required: ['word', 'meaning'],
              },
            },
          },
          required: [
            'whatYouSaidMeaning',
            'naturalCorrection',
            'tutorReply',
            'tutorReplyMeaning',
            'feedbackEn',
            'feedbackBn',
            'wordBreakdown',
          ],
        },
      },
    });
    return safeJsonParse<Record<string, unknown>>(response.text, {});
  });

  if (parsed?.tutorReply) setCached(cacheKey, parsed);
  return parsed;
}

export async function translateUiBundleWithGemini(params: {
  targetLanguage: string;
  strings: Record<string, string>;
}) {
  const cacheKey = `ui:${params.targetLanguage.toLowerCase()}`;
  const cached = getCached<Record<string, string>>(cacheKey);
  if (cached) return cached;

  const ai = getClient();
  const entries = Object.entries(params.strings);

  const parsed = await runWithFastModel(async (model, thinkingLevel) => {
    const response = await ai.models.generateContent({
      model,
      contents: `Translate every value to natural ${params.targetLanguage}. Keep "key" unchanged and keep "LingoBangla":\n${JSON.stringify(
        entries.map(([key, value]) => ({ key, value }))
      )}`,
      config: {
        thinkingConfig: { thinkingLevel },
        systemInstruction: 'Fast UI localizer. Return accurate key-value translations.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
                required: ['key', 'value'],
              },
            },
          },
          required: ['translations'],
        },
      },
    });

    return safeJsonParse<{ translations: Array<{ key: string; value: string }> }>(
      response.text,
      { translations: [] }
    );
  }, 12000);

  const result: Record<string, string> = {};
  for (const item of parsed.translations || []) {
    if (item.key && item.value) {
      result[item.key] = item.value;
    }
  }

  if (Object.keys(result).length > 0) {
    setCached(cacheKey, result);
  }
  return result;
}
