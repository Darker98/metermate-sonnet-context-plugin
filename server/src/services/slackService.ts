import {
  ChatApi,
  ConversationsApi,
  UsersApi,
  ApiError,
} from 'slack-apimatic-sdk';
import { getSlackClient, getBotToken } from '../slackClient';
import { transactionStore } from '../stores/transactionStore';
import { Transaction } from '../types';

export interface TxnChannelResult {
  channelId: string;
  channelName: string;
  clientInvited: boolean;
  consultantInvited: boolean;
}

function sanitizeChannelSegment(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
}

function buildChannelName(consultantId: string, clientEmail: string, seq: number): string {
  const consultantSlug = sanitizeChannelSegment(consultantId);
  const clientSlug = sanitizeChannelSegment(clientEmail.split('@')[0]);
  const name = `txn-${consultantSlug}-${clientSlug}-${seq.toString().padStart(3, '0')}`;
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
    if (err instanceof ApiError) {
      const body = err.body as string;
      if (body.includes('users_not_found')) {
        return null;
      }
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
      if (channel) {
        return { id: channel.id as string, name: channel.name as string };
      }
    }
    return null;
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as string;
      if (body.includes('name_taken')) {
        return null;
      }
      console.error('[slackService] createPrivateChannel error:', err.statusCode, err.body);
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
    if (err instanceof ApiError) {
      const body = err.body as string;
      if (body.includes('already_in_channel')) return true;
      console.warn('[slackService] inviteUserToChannel failed:', err.statusCode, err.body);
    }
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
    console.error('[slackService] postMessage error:', err instanceof ApiError ? err.body : err);
  }
}

let _channelSeq = 1;

export const slackService = {
  async ensureTxnChannel(
    txn: Transaction,
    consultantEmail: string
  ): Promise<TxnChannelResult> {
    const existingChannelId = transactionStore.getChannelId(txn.consultantId, txn.clientEmail);
    if (existingChannelId && txn.channelId) {
      return {
        channelId: txn.channelId,
        channelName: txn.channelName ?? '',
        clientInvited: false,
        consultantInvited: false,
      };
    }

    const channelName = buildChannelName(txn.consultantId, txn.clientEmail, _channelSeq++);
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
      console.warn(`[slackService] Client ${txn.clientEmail} not found in workspace — will notify by email via Maxio`);
    }

    await postMessage(
      channelId,
      ':wave: Transaction started',
      buildStartedBlocks(txn)
    );

    if (!clientInvited) {
      await postMessage(
        channelId,
        ':information_source: Client could not be added to this channel (not a workspace member). They will be notified by email.'
      );
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
    const usersApi = new UsersApi(getSlackClient());
    try {
      await usersApi.usersList(token, 1);
      return true;
    } catch {
      return false;
    }
  },
};

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
        { type: 'mrkdwn', text: `*Transaction ID:*\n${txn.txnId}` },
      ],
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Started at <!date^${Math.floor(txn.createdAt / 1000)}^{date_short_pretty} {time}|${new Date(txn.createdAt).toISOString()}>` }],
    },
  ];
}

function buildFailureBlocks(ucName: string, errorSummary: string): Record<string, unknown>[] {
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
