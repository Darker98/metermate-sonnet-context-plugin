import { getSessionId } from './session';

const BASE = '/api';

async function post<T>(path: string, body: Record<string, unknown>, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ ...body, sessionId: getSessionId() }),
  });
  const data = await res.json();
  return data as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json();
  return data as T;
}

function adminHeaders(user: string, password: string): Record<string, string> {
  return { Authorization: `Basic ${btoa(`${user}:${password}`)}` };
}

export interface MutatingResponse {
  status: 'ok' | 'maxio_failed' | 'invalid' | 'session_expired';
  txnId?: string;
  channelId?: string;
  channelName?: string;
  error?: string;
  [key: string]: unknown;
}

export interface HealthResponse {
  status: string;
  sessions: number;
  transactions: number;
  maxioSite: string;
  slackOk: boolean;
}

export interface Consultant {
  id: string;
  name: string;
  email: string;
}

export interface Product {
  id: number;
  handle: string;
  name: string;
  priceInCents: number;
  interval: number;
  intervalUnit: string;
}

export const api = {
  health: () => get<HealthResponse>('/health'),

  consultants: () => get<{ consultants: Consultant[] }>('/consultants'),

  products: () => get<{ products: Product[] }>('/products'),

  book: (body: {
    firstName: string;
    lastName: string;
    email: string;
    consultantId: string;
    productHandle: string;
    collectionMethod: 'automatic' | 'remittance';
    couponCode?: string;
  }) => post<MutatingResponse>('/book', body),

  usage: (body: {
    txnRef: string;
    componentHandle: string;
    quantity: number;
    memo?: string;
    timestamp?: string;
  }) => post<MutatingResponse>('/usage', body),

  planChangePreview: (body: {
    txnRef: string;
    targetHandle: string;
    timing: 'prorate' | 'at-renewal';
  }) => post<MutatingResponse>('/plan-change/preview', body),

  planChange: (body: {
    txnRef: string;
    targetHandle: string;
    timing: 'prorate' | 'at-renewal';
  }) => post<MutatingResponse>('/plan-change', body),

  lifecycle: (body: {
    txnRef: string;
    action: 'pause' | 'resume' | 'cancel' | 'reactivate';
    cancelType?: 'immediate' | 'end-of-period';
    reasonCode?: string;
  }) => post<MutatingResponse>('/lifecycle', body),

  invoices: (
    body: {
      txnRef: string;
      lineItems?: { title: string; quantity: number; unitPrice: string }[];
      memo?: string;
      sendEmail: boolean;
    },
    adminUser: string,
    adminPassword: string
  ) => post<MutatingResponse>('/invoices', body, adminHeaders(adminUser, adminPassword)),

  digest: (
    body: { consultantId: string; windowDays?: number },
    adminUser: string,
    adminPassword: string
  ) => post<MutatingResponse>('/digest', body, adminHeaders(adminUser, adminPassword)),
};
