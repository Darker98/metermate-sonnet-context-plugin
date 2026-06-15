import { Consultant } from './types';

export const CONSULTANTS: Consultant[] = [
  { id: 'c1', name: 'Alice Consultant', email: 'alice@example.com' },
  { id: 'c2', name: 'Bob Consultant', email: 'bob@example.com' },
  { id: 'c3', name: 'Zaid Consultant', email: 'zmsiddiqui321@gmail.com' }
];

export function findConsultant(id: string): Consultant | undefined {
  return CONSULTANTS.find((c) => c.id === id);
}
