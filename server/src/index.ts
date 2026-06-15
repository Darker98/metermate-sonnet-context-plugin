import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { config } from './config';
import { sessionStore } from './stores/sessionStore';
import { metaRouter } from './routes/meta';
import { bookRouter } from './routes/book';
import { usageRouter } from './routes/usage';
import { planChangeRouter } from './routes/planChange';
import { lifecycleRouter } from './routes/lifecycle';
import { invoicesRouter } from './routes/invoices';
import { digestRouter } from './routes/digest';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', metaRouter);
app.use('/api/book', bookRouter);
app.use('/api/usage', usageRouter);
app.use('/api/plan-change', planChangeRouter);
app.use('/api/lifecycle', lifecycleRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/digest', digestRouter);

if (process.env.NODE_ENV === 'production') {
  const webDist = path.resolve(__dirname, '../../web/dist');
  app.use(express.static(webDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

const ttlMs = config.session.ttlMinutes * 60 * 1000;
setInterval(() => {
  const removed = sessionStore.sweep();
  if (removed > 0) console.log(`[session sweep] removed ${removed} expired sessions`);
}, ttlMs);

app.listen(config.port, () => {
  console.log(`[metermate] Server running on http://localhost:${config.port}`);
  console.log(`[metermate] Maxio site: ${config.maxio.siteSubdomain} (${config.maxio.environment})`);
  console.log(`[metermate] Demo mode: ${config.demoMode}`);
});

export default app;
