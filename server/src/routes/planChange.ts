import { Router } from 'express';

export const planChangeRouter = Router();

planChangeRouter.post('/preview', (_req, res) => {
  res.status(501).json({ status: 'invalid', error: 'UC3 preview not yet implemented' });
});

planChangeRouter.post('/', (_req, res) => {
  res.status(501).json({ status: 'invalid', error: 'UC3 not yet implemented' });
});
