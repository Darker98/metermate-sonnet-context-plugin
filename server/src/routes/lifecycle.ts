import { Router } from 'express';

export const lifecycleRouter = Router();

lifecycleRouter.post('/', (_req, res) => {
  res.status(501).json({ status: 'invalid', error: 'UC4 not yet implemented' });
});
