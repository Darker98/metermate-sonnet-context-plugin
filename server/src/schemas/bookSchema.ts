import { z } from 'zod';

export const BookSchema = z.object({
  sessionId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  consultantId: z.string().min(1),
  productHandle: z.string().min(1),
  collectionMethod: z.enum(['automatic', 'remittance']),
  couponCode: z.string().optional(),
});

export type BookInput = z.infer<typeof BookSchema>;
