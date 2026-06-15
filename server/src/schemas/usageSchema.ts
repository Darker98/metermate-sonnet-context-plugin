import { z } from 'zod';

export const UsageSchema = z.object({
  sessionId: z.string().min(1),
  txnRef: z.string().min(1),
  componentHandle: z.string().min(1),
  quantity: z.number().positive(),
  memo: z.string().optional(),
  timestamp: z.string().optional(),
});

export type UsageInput = z.infer<typeof UsageSchema>;
