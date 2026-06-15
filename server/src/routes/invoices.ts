import { Router } from 'express';
import { adminGuard } from '../auth';

export const invoicesRouter = Router();

invoicesRouter.post('/', adminGuard, (_req, res) => {
  res.status(501).json({ status: 'invalid', error: 'UC5 not yet implemented' });
});
