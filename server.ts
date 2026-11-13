import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import {
  analyzeSpeakingWithGemini,
  checkGrammarWithGemini,
  generateBulkWordsWithGemini,
  generateSentencesWithGemini,
  lookupDictionaryWithGemini,
  translateUiBundleWithGemini,
  translateWithGemini,
} from './server/gemini.ts';

const PORT = Number(process.env.PORT) || 3000;

function formatAiError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('[LingoBangla AI Error]', msg);
  if (msg.includes('GEMINI_API_KEY is not configured')) {
    return {
      status: 503,
      message: 'AI service key is not configured on the server. Set GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return {
      status: 503,
      message: 'The configured Gemini API key was rejected. Please verify GEMINI_API_KEY in Settings > Secrets.',
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    const key = process.env.GEMINI_API_KEY;
    res.json({
      ok: true,
      aiConfigured: Boolean(key && key !== 'MY_GEMINI_API_KEY'),
    });
  });

  app.post('/api/translate', async (req, res) => {
    const { text, sourceLang = 'Auto Detect', targetLang = 'Bengali' } = req.body ?? {};
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
      res.json(result);
    } catch (err) {
      const formatted = formatAiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/dictionary', async (req, res) => {
    const { word, meaningLanguage = 'Bengali' } = req.body ?? {};
    if (typeof word !== 'string' || !word.trim()) {
      res.status(400).json({ error: 'Please enter a word to search.' });
      return;
    }
    try {
      const entry = await lookupDictionaryWithGemini({
        word: word.trim(),
        meaningLanguage: String(meaningLanguage),
      });
      res.json(entry);
    } catch (err) {
      const formatted = formatAiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/words/bulk', async (req, res) => {
    const {
      topic,
      count = 25,
      meaningLanguage = 'Bengali',
      excludeWords = [],
    } = req.body ?? {};
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
      res.json(data);
    } catch (err) {
      const formatted = formatAiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/sentences/generate', async (req, res) => {
    const { input, meaningLanguage = 'Bengali', focus } = req.body ?? {};
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
      res.json(data);
    } catch (err) {
      const formatted = formatAiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/grammar/check', async (req, res) => {
    const { text, language = 'en' } = req.body ?? {};
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
        language: language === 'bn' ? 'bn' : 'en',
      });
      res.json(analysis);
    } catch (err) {
      const formatted = formatAiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/speaking/feedback', async (req, res) => {
    const { topic, promptQuestion, transcript, meaningLanguage = 'Bengali' } = req.body ?? {};
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
      res.json(feedback);
    } catch (err) {
      const formatted = formatAiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/ui-translate', async (req, res) => {
    const { targetLanguage, strings } = req.body ?? {};
    if (typeof targetLanguage !== 'string' || !targetLanguage.trim()) {
      res.status(400).json({ error: 'Target language is required.' });
      return;
    }
    if (!strings || typeof strings !== 'object') {
      res.status(400).json({ error: 'UI strings object is required.' });
      return;
    }
    try {
      const translations = await translateUiBundleWithGemini({
        targetLanguage: targetLanguage.trim(),
        strings,
      });
      res.json({ translations });
    } catch (err) {
      const formatted = formatAiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output missing. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LingoBangla server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start LingoBangla server:', err);
  process.exit(1);
});
