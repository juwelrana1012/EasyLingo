import {
  analyzeSpeakingWithGemini,
  checkGrammarWithGemini,
  generateBulkWordsWithGemini,
  generateSentencesWithGemini,
  lookupDictionaryWithGemini,
  translateUiBundleWithGemini,
  translateWithGemini,
} from './gemini';

export interface ApiRequestLike {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator]?: () => AsyncIterator<Buffer | string>;
}

export interface ApiResponseLike {
  status: (code: number) => ApiResponseLike;
  json: (payload: unknown) => void;
  setHeader?: (name: string, value: string) => void;
  end?: (chunk?: string) => void;
}

export function formatAiError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('[EasyLingo AI Error]', msg);
  if (msg.includes('GEMINI_API_KEY is not configured')) {
    return {
      status: 503,
      message:
        'AI service key (GEMINI_API_KEY) is not configured on the server. Please add GEMINI_API_KEY in Vercel Environment Variables (or Settings > Secrets) and redeploy.',
    };
  }
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return {
      status: 503,
      message:
        'The configured Gemini API key was rejected. Please verify GEMINI_API_KEY in your server Environment Variables.',
    };
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'AI rate limit reached. Please wait a moment and try again.',
    };
  }
  return {
    status: 500,
    message: 'AI request failed. Please try again shortly.',
  };
}

export async function readJsonBody(req: ApiRequestLike): Promise<Record<string, unknown>> {
  const existing = req.body;
  if (existing !== undefined && existing !== null) {
    if (typeof existing === 'string') {
      if (!existing.trim()) return {};
      try {
        const parsed = JSON.parse(existing);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    }
    if (Buffer.isBuffer(existing)) {
      const str = existing.toString('utf8').trim();
      if (!str) return {};
      try {
        const parsed = JSON.parse(str);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    }
    if (typeof existing === 'object') {
      return existing as Record<string, unknown>;
    }
  }

  if (typeof req[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of req as AsyncIterable<Buffer | string>) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  return {};
}

export function handlePreflightOrMethod(
  req: ApiRequestLike,
  res: ApiResponseLike,
  allowedMethod: 'GET' | 'POST'
): boolean {
  res.setHeader?.('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') {
    res.status(204);
    if (res.end) {
      res.end();
    } else {
      res.json({});
    }
    return true;
  }
  if (req.method && req.method !== allowedMethod) {
    res.status(405).json({ error: `Method ${req.method} not allowed.` });
    return true;
  }
  return false;
}

export async function handleHealth(req: ApiRequestLike, res: ApiResponseLike) {
  if (handlePreflightOrMethod(req, res, 'GET')) return;
  const key = process.env.GEMINI_API_KEY;
  res.status(200).json({
    ok: true,
    aiConfigured: Boolean(key && key !== 'MY_GEMINI_API_KEY'),
  });
}

export async function handleTranslate(req: ApiRequestLike, res: ApiResponseLike) {
  if (handlePreflightOrMethod(req, res, 'POST')) return;
  const body = await readJsonBody(req);
  const text = body.text;
  const sourceLang = typeof body.sourceLang === 'string' ? body.sourceLang : 'Auto Detect';
  const targetLang = typeof body.targetLang === 'string' ? body.targetLang : 'Bengali';

  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Please enter text to translate.' });
    return;
  }
  if (text.length > 4000) {
    res.status(400).json({ error: 'Text cannot exceed 4,000 characters.' });
    return;
  }
  try {
    const result = await translateWithGemini({ text: text.trim(), sourceLang, targetLang });
    res.status(200).json(result);
  } catch (err) {
    const formatted = formatAiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
}

export async function handleDictionary(req: ApiRequestLike, res: ApiResponseLike) {
  if (handlePreflightOrMethod(req, res, 'POST')) return;
  const body = await readJsonBody(req);
  const word = body.word;
  const meaningLanguage = body.meaningLanguage ?? 'Bengali';

  if (typeof word !== 'string' || !word.trim()) {
    res.status(400).json({ error: 'Please enter a word to search.' });
    return;
  }
  try {
    const entry = await lookupDictionaryWithGemini({
      word: word.trim(),
      meaningLanguage: String(meaningLanguage),
    });
    res.status(200).json(entry);
  } catch (err) {
    const formatted = formatAiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
}

export async function handleBulkWords(req: ApiRequestLike, res: ApiResponseLike) {
  if (handlePreflightOrMethod(req, res, 'POST')) return;
  const body = await readJsonBody(req);
  const topic = body.topic;
  const count = body.count ?? 25;
  const meaningLanguage = body.meaningLanguage ?? 'Bengali';
  const excludeWords = body.excludeWords;

  if (typeof topic !== 'string' || !topic.trim()) {
    res.status(400).json({ error: 'Please enter a topic for word generation.' });
    return;
  }
  try {
    const data = await generateBulkWordsWithGemini({
      topic: topic.trim(),
      count: Math.min(Math.max(Number(count) || 25, 5), 50),
      meaningLanguage: String(meaningLanguage),
      excludeWords: Array.isArray(excludeWords) ? excludeWords.map(String) : [],
    });
    res.status(200).json(data);
  } catch (err) {
    const formatted = formatAiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
}

export async function handleSentencesGenerate(req: ApiRequestLike, res: ApiResponseLike) {
  if (handlePreflightOrMethod(req, res, 'POST')) return;
  const body = await readJsonBody(req);
  const input = body.input;
  const meaningLanguage = body.meaningLanguage ?? 'Bengali';
  const focus = body.focus;

  if (typeof input !== 'string' || !input.trim()) {
    res.status(400).json({ error: 'Please enter a word, phrase, or topic.' });
    return;
  }
  try {
    const data = await generateSentencesWithGemini({
      input: input.trim(),
      meaningLanguage: String(meaningLanguage),
      focus: typeof focus === 'string' ? focus : undefined,
    });
    res.status(200).json(data);
  } catch (err) {
    const formatted = formatAiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
}

export async function handleGrammarCheck(req: ApiRequestLike, res: ApiResponseLike) {
  if (handlePreflightOrMethod(req, res, 'POST')) return;
  const body = await readJsonBody(req);
  const text = body.text;
  const language = body.language === 'bn' ? 'bn' : 'en';

  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Please enter text to check.' });
    return;
  }
  if (text.length > 3000) {
    res.status(400).json({ error: 'Text cannot exceed 3,000 characters.' });
    return;
  }
  try {
    const analysis = await checkGrammarWithGemini({
      text: text.trim(),
      language,
    });
    res.status(200).json(analysis);
  } catch (err) {
    const formatted = formatAiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
}

export async function handleSpeakingFeedback(req: ApiRequestLike, res: ApiResponseLike) {
  if (handlePreflightOrMethod(req, res, 'POST')) return;
  const body = await readJsonBody(req);
  const topic = body.topic;
  const promptQuestion = body.promptQuestion;
  const transcript = body.transcript;
  const meaningLanguage = body.meaningLanguage ?? 'Bengali';

  if (typeof transcript !== 'string' || !transcript.trim()) {
    res.status(400).json({ error: 'Spoken transcript is required for feedback.' });
    return;
  }
  try {
    const feedback = await analyzeSpeakingWithGemini({
      topic: typeof topic === 'string' ? topic : 'Daily Conversation',
      promptQuestion:
        typeof promptQuestion === 'string' ? promptQuestion : 'Tell me about your day.',
      transcript: transcript.trim(),
      meaningLanguage: String(meaningLanguage),
    });
    res.status(200).json(feedback);
  } catch (err) {
    const formatted = formatAiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
}

export async function handleUiTranslate(req: ApiRequestLike, res: ApiResponseLike) {
  if (handlePreflightOrMethod(req, res, 'POST')) return;
  const body = await readJsonBody(req);
  const targetLanguage = body.targetLanguage;
  const strings = body.strings;

  if (typeof targetLanguage !== 'string' || !targetLanguage.trim()) {
    res.status(400).json({ error: 'Target language is required.' });
    return;
  }
  if (!strings || typeof strings !== 'object' || Array.isArray(strings)) {
    res.status(400).json({ error: 'UI strings object is required.' });
    return;
  }
  try {
    const translations = await translateUiBundleWithGemini({
      targetLanguage: targetLanguage.trim(),
      strings: strings as Record<string, string>,
    });
    res.status(200).json({ translations });
  } catch (err) {
    const formatted = formatAiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
}
