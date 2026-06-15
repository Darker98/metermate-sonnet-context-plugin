import { getMaxioClient } from '../maxioClient';

export class MaxioError extends Error {
  constructor(
    message: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'MaxioError';
  }
}

function extractMaxioError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e['body'] === 'string') {
      try {
        const parsed = JSON.parse(e['body'] as string);
        if (parsed.errors) return (parsed.errors as string[]).join(', ');
        if (parsed.error) return parsed.error as string;
      } catch {
        return e['body'] as string;
      }
    }
    if (e['message']) return String(e['message']);
  }
  return String(err);
}

export const maxioService = {
  getClient() {
    return getMaxioClient();
  },

  extractMaxioError,
};
