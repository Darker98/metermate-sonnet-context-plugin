import { SessionData } from '../types';
import { config } from '../config';

const store = new Map<string, SessionData>();

export const sessionStore = {
  get(sessionId: string): SessionData | undefined {
    return store.get(sessionId);
  },

  put(sessionId: string, data: Partial<SessionData>): SessionData {
    const now = Date.now();
    const existing = store.get(sessionId);
    const session: SessionData = {
      sessionId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...existing,
      ...data,
    };
    store.set(sessionId, session);
    return session;
  },

  delete(sessionId: string): void {
    store.delete(sessionId);
  },

  sweep(): number {
    const cutoff = Date.now() - config.session.ttlMinutes * 60 * 1000;
    let removed = 0;
    for (const [id, session] of store.entries()) {
      if (session.updatedAt < cutoff) {
        store.delete(id);
        removed++;
      }
    }
    return removed;
  },

  size(): number {
    return store.size;
  },
};
