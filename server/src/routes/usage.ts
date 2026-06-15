import { Router } from 'express';

export const usageRouter = Router();

usageRouter.post('/', (_req, res) => {
  res.status(501).json({ status: 'invalid', error: 'UC2 not yet implemented' });
});
