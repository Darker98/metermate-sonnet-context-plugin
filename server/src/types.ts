export type TransactionType =
  | 'subscription'
  | 'usage'
  | 'plan_change'
  | 'lifecycle'
  | 'invoice'
  | 'digest';

export type TransactionState = 'started' | 'completed' | 'failed';

export type CollectionMethod = 'automatic' | 'remittance';

export type LifecycleAction = 'pause' | 'resume' | 'cancel' | 'reactivate';

export type CancelType = 'immediate' | 'end-of-period';

export type PlanTiming = 'prorate' | 'at-renewal';

export interface Transaction {
  txnId: string;
  consultantId: string;
  clientEmail: string;
  type: TransactionType;
  state: TransactionState;
  channelId?: string;
  channelName?: string;
  subscriptionId?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SessionData {
  sessionId: string;
  lastSubmission?: Record<string, unknown>;
  lastResult?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface Consultant {
  id: string;
  name: string;
  email: string;
  slackUserId?: string;
}

export interface MutatingResponse {
  status: 'ok' | 'maxio_failed' | 'invalid' | 'session_expired';
  txnId?: string;
  channelId?: string;
  channelName?: string;
  [key: string]: unknown;
}

export interface LineItem {
  title: string;
  quantity: number;
  unitPrice: string;
}
