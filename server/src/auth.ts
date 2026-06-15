import { Request, Response, NextFunction } from 'express';
import { config } from './config';

export function adminGuard(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.status(401).json({ status: 'invalid', error: 'Admin authentication required' });
    return;
  }

  const encoded = authHeader.slice('Basic '.length);
  let decoded: string;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    res.status(401).json({ status: 'invalid', error: 'Malformed authorization header' });
    return;
  }

  const [user, ...rest] = decoded.split(':');
  const password = rest.join(':');

  if (user !== config.admin.user || password !== config.admin.password) {
    res.status(403).json({ status: 'invalid', error: 'Invalid admin credentials' });
    return;
  }

  next();
}
