import { Router } from 'express';

export const bookRouter = Router();

bookRouter.post('/', (_req, res) => {
  res.status(501).json({ status: 'invalid', error: 'UC1 not yet implemented' });
});
