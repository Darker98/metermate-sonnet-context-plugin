import { Router } from 'express';
import { adminGuard } from '../auth';

export const digestRouter = Router();

digestRouter.post('/', adminGuard, (_req, res) => {
  res.status(501).json({ status: 'invalid', error: 'UC6 not yet implemented' });
});
