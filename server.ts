import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import {
  handleBulkWords,
  handleDictionary,
  handleGrammarCheck,
  handleHealth,
  handleSentencesGenerate,
  handleSpeakingFeedback,
  handleTranslate,
  handleUiTranslate,
} from './server/apiHandlers';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', handleHealth);
  app.post('/api/translate', handleTranslate);
  app.post('/api/dictionary', handleDictionary);
  app.post('/api/words/bulk', handleBulkWords);
  app.post('/api/sentences/generate', handleSentencesGenerate);
  app.post('/api/grammar/check', handleGrammarCheck);
  app.post('/api/speaking/feedback', handleSpeakingFeedback);
  app.post('/api/ui-translate', handleUiTranslate);

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
