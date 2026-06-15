import {
  AuthApi,
  ChatApi,
  ConversationsApi,
  UsersApi,
  ApiError,
} from 'slack-apimatic-sdk';
import { getSlackClient, getBotToken } from '../slackClient';
import { transactionStore } from '../stores/transactionStore';
import { Transaction } from '../types';
import { SubscriptionResult, UsageResult } from './maxioService';

export interface TxnChannelResult {
  channelId: string;
  channelName: string;
  clientInvited: boolean;
  consultantInvited: boolean;
}

// The slack-apimatic-sdk has a schema bug: Slack returns `ok` as boolean
// but the SDK schema expects a string. This helper extracts the parsed body
// from any error (ApiError or ResponseValidationError) and checks for ok:true.
function isSlackSuccessBody(err: unknown): { ok: boolean; body: Record<string, unknown> | null } {
  const e = err as Record<string, unknown>;
  const statusCode = e['statusCode'];
  const rawBody = e['body'] as string | undefined;
  if (statusCode === 200 && rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as Record<string, unknown>;
      return { ok: parsed['ok'] === true, body: parsed };
    } catch { /* fall through */ }
  }
  return { ok: false, body: null };
}

function sanitizeChannelSegment(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
}

function buildChannelName(consultantId: string, clientEmail: string, txnId: string): string {
  const consultantSlug = sanitizeChannelSegment(consultantId);
  const clientSlug = sanitizeChannelSegment(clientEmail.split('@')[0]);
  const shortId = txnId.replace('txn_', '').slice(0, 8);
  const name = `txn-${consultantSlug}-${clientSlug}-${shortId}`;
  return name.slice(0, 80);
}

async function lookupUserByEmail(email: string): Promise<string | null> {
  const token = getBotToken();
  const usersApi = new UsersApi(getSlackClient());
  try {
    const response = await usersApi.usersLookupByEmail(token, email);
    if (response.result && response.result.ok) {
      const user = (response.result as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
      return (user?.id as string) ?? null;
    }
    return null;
  } catch (err) {
    const { ok, body } = isSlackSuccessBody(err);
    if (ok && body) {
      const user = body['user'] as Record<string, unknown> | undefined;
      return (user?.['id'] as string) ?? null;
    }
    if (err instanceof ApiError) {
      const rawBody = err.body as string;
      if (rawBody.includes('users_not_found')) return null;
      console.warn('[slackService] lookupUserByEmail error:', err.statusCode, err.body);
    }
    return null;
  }
}

async function createPrivateChannel(name: string): Promise<{ id: string; name: string } | null> {
  const token = getBotToken();
  const conversationsApi = new ConversationsApi(getSlackClient());
  try {
    const response = await conversationsApi.conversationsCreate(token, name, true);
    if (response.result && response.result.ok) {
      const channel = (response.result as unknown as Record<string, unknown>).channel as Record<string, unknown> | undefined;
      if (channel) return { id: channel['id'] as string, name: channel['name'] as string };
    }
    return null;
  } catch (err) {
    const { ok, body } = isSlackSuccessBody(err);
    if (ok && body) {
      const channel = body['channel'] as Record<string, unknown> | undefined;
      if (channel) return { id: channel['id'] as string, name: channel['name'] as string };
    }
    if (err instanceof ApiError) {
      const rawBody = err.body as string;
      if (rawBody.includes('name_taken')) return null;
      console.error('[slackService] createPrivateChannel error:', err.statusCode, err.body);
    } else {
      const e = err as Record<string, unknown>;
      const rawBody = e['body'] as string | undefined;
      if (rawBody?.includes('name_taken')) return null;
      console.error('[slackService] createPrivateChannel error:', e['statusCode'], rawBody);
    }
    return null;
  }
}

async function inviteUserToChannel(channelId: string, userId: string): Promise<boolean> {
  const token = getBotToken();
  const conversationsApi = new ConversationsApi(getSlackClient());
  try {
    await conversationsApi.conversationsInvite(token, channelId, userId);
    return true;
  } catch (err) {
    const { ok } = isSlackSuccessBody(err);
    if (ok) return true;
    const rawBody =
      err instanceof ApiError
        ? (err.body as string)
        : ((err as Record<string, unknown>)['body'] as string | undefined) ?? '';
    if (rawBody.includes('already_in_channel')) return true;
    console.warn('[slackService] inviteUserToChannel failed:', rawBody);
    return false;
  }
}

async function postMessage(
  channelId: string,
  text: string,
  blocks?: Record<string, unknown>[]
): Promise<void> {
  const token = getBotToken();
  const chatApi = new ChatApi(getSlackClient());
  try {
    await chatApi.chatPostMessage(
      token,
      channelId,
      undefined,                                   // asUser
      undefined,                                   // attachments
      blocks ? JSON.stringify(blocks) : undefined, // blocks
      undefined,                                   // iconEmoji
      undefined,                                   // iconUrl
      undefined,                                   // linkNames
      undefined,                                   // mrkdwn
      undefined,                                   // parse
      undefined,                                   // replyBroadcast
      text                                         // text
    );
  } catch (err) {
    const { ok } = isSlackSuccessBody(err);
    if (ok) return; // SDK schema bug but message sent successfully
    console.error('[slackService] postMessage error:', err instanceof ApiError ? err.body : (err as Error).message);
  }
}

export const slackService = {
  async ensureTxnChannel(
    txn: Transaction,
    consultantEmail: string
  ): Promise<TxnChannelResult> {
    const existingChannelId = transactionStore.getChannelId(txn.consultantId, txn.clientEmail);
    if (existingChannelId && txn.channelId) {
      return { channelId: txn.channelId, channelName: txn.channelName ?? '', clientInvited: false, consultantInvited: false };
    }

    const channelName = buildChannelName(txn.consultantId, txn.clientEmail, txn.txnId);
    const created = await createPrivateChannel(channelName);

    let channelId: string;
    let resolvedChannelName: string;

    if (!created) {
      channelId = existingChannelId ?? '';
      resolvedChannelName = txn.channelName ?? channelName;
      if (!channelId) {
        console.error('[slackService] Could not create or find channel');
        return { channelId: '', channelName: channelName, clientInvited: false, consultantInvited: false };
      }
    } else {
      channelId = created.id;
      resolvedChannelName = created.name;
    }

    transactionStore.setChannel(txn.txnId, channelId, resolvedChannelName);

    const [consultantUserId, clientUserId] = await Promise.all([
      lookupUserByEmail(consultantEmail),
      lookupUserByEmail(txn.clientEmail),
    ]);

    let consultantInvited = false;
    let clientInvited = false;

    if (consultantUserId) {
      consultantInvited = await inviteUserToChannel(channelId, consultantUserId);
    } else {
      console.warn(`[slackService] Consultant ${consultantEmail} not found in workspace`);
    }

    if (clientUserId) {
      clientInvited = await inviteUserToChannel(channelId, clientUserId);
    } else {
      console.warn(`[slackService] Client ${txn.clientEmail} not found — will notify by email via Maxio`);
    }

    await postMessage(channelId, ':wave: Transaction started', buildStartedBlocks(txn));

    if (!clientInvited) {
      await postMessage(channelId, ':information_source: Client could not be added (not a workspace member). They will be notified by email.');
    }

    return { channelId, channelName: resolvedChannelName, clientInvited, consultantInvited };
  },

  async postProgress(channelId: string, text: string, blocks?: Record<string, unknown>[]): Promise<void> {
    await postMessage(channelId, text, blocks);
  },

  async postCompletion(channelId: string, text: string, blocks: Record<string, unknown>[]): Promise<void> {
    await postMessage(channelId, text, blocks);
  },

  async postFailure(channelId: string, errorSummary: string, ucName: string): Promise<void> {
    await postMessage(channelId, `:warning: ${ucName} failed`, buildFailureBlocks(ucName, errorSummary));
  },

  async checkHealth(): Promise<boolean> {
    const token = getBotToken();
    const authApi = new AuthApi(getSlackClient());
    try {
      const response = await authApi.authTest(token);
      return response.statusCode === 200;
    } catch (err) {
      const { ok } = isSlackSuccessBody(err);
      if (ok) return true;
      if (err instanceof ApiError) {
        console.error('[slack health] ApiError', err.statusCode, err.body);
      } else {
        console.error('[slack health] error', (err as Error).message ?? err);
      }
      return false;
    }
  },

  buildUC1ProgressBlocks,
  buildUC1CompletionBlocks,
  buildUC2ProgressBlocks,
  buildUC2CompletionBlocks,
  buildFailureBlocks,
};

// ─── Block Kit builders ───────────────────────────────────────────────────────

function buildStartedBlocks(txn: Transaction): Record<string, unknown>[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: ':wave: Transaction started', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Consultant:*\n${txn.consultantId}` },
        { type: 'mrkdwn', text: `*Client:*\n${txn.clientEmail}` },
        { type: 'mrkdwn', text: `*Type:*\n${txn.type}` },
        { type: 'mrkdwn', text: `*Transaction ID:*\n\`${txn.txnId}\`` },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Started <!date^${Math.floor(txn.createdAt / 1000)}^{date_short_pretty} {time}|${new Date(txn.createdAt).toISOString()}>`,
        },
      ],
    },
  ];
}

export function buildUC1ProgressBlocks(): Record<string, unknown>[] {
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: ':hourglass_flowing_sand: *Creating subscription in Maxio…*' },
    },
  ];
}

export function buildUC1CompletionBlocks(result: SubscriptionResult): Record<string, unknown>[] {
  const mrrDollars = (Number(result.mrrCents) / 100).toFixed(2);
  const nextBill = result.nextAssessmentAt
    ? new Date(result.nextAssessmentAt).toLocaleDateString('en-US', { dateStyle: 'medium' })
    : 'N/A';

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: ':tada: Subscription active', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Customer:*\n${result.customerName}` },
        { type: 'mrkdwn', text: `*Email:*\n${result.customerEmail}` },
        { type: 'mrkdwn', text: `*Plan:*\n${result.productName}` },
        { type: 'mrkdwn', text: `*MRR:*\n$${mrrDollars}/mo` },
        { type: 'mrkdwn', text: `*State:*\n${result.state}` },
        { type: 'mrkdwn', text: `*Next Bill:*\n${nextBill}` },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View in Maxio', emoji: true },
          url: result.maxioUrl,
          style: 'primary',
        },
      ],
    },
  ];
}

export function buildUC2ProgressBlocks(componentHandle: string, quantity: number): Record<string, unknown>[] {
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `:bar_chart: *Recording usage…*\nComponent: \`${componentHandle}\` · Quantity: *${quantity}*` },
    },
  ];
}

export function buildUC2CompletionBlocks(result: UsageResult): Record<string, unknown>[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: ':white_check_mark: Usage recorded', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Component:*\n\`${result.componentHandle}\`` },
        { type: 'mrkdwn', text: `*This report:*\n${result.quantity}` },
        { type: 'mrkdwn', text: `*Period total:*\n${result.periodTotalQuantity}` },
        { type: 'mrkdwn', text: `*Memo:*\n${result.memo ?? '—'}` },
      ],
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: 'Accrues to next invoice.' }],
    },
  ];
}

export function buildFailureBlocks(ucName: string, errorSummary: string): Record<string, unknown>[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `:warning: ${ucName} failed`, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Error:*\n${errorSummary}` },
    },
  ];
}
